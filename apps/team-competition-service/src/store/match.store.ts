import Redis from "ioredis";
import { env } from "../config/env";
import type { TeamMatch } from "../types/match";

const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  enableOfflineQueue: false,
});
redis.on("error", () => undefined);

const memory = new Map<string, TeamMatch>();
const memoryMembership = new Map<string, string>();
const memoryOwnership = new Map<string, string>();
let useMemoryStore = false;
let memoryMatchmakingLocked = false;
const matchmakingLockKey = "team-match:matchmaking-lock";

const matchKey = (id: string) => `team-match:${id}`;
const inviteKey = (code: string) => `team-match:invite:${code}`;
const membershipKey = (userId: string) => `team-match:user:${userId}`;
const ownershipKey = (userId: string) => `team-match:owner:${userId}`;
const queueKey = (difficulty: string, teamCount: number) =>
  `team-match:queue:${difficulty}:${teamCount}`;

export async function connectStore(): Promise<void> {
  try {
    await redis.connect();
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    useMemoryStore = true;
    redis.disconnect();
    console.warn(
      "[team-competition-service] Redis unavailable; using the development-only in-memory store",
    );
  }
}

export async function closeStore(): Promise<void> {
  if (useMemoryStore) return;
  await redis.quit();
}

export async function saveMatch(match: TeamMatch): Promise<void> {
  if (useMemoryStore) {
    memory.set(match.id, structuredClone(match));
    match.teams.forEach((team) =>
      team.players.forEach((player) => memoryMembership.set(player.userId, match.id)),
    );
    memoryOwnership.set(match.createdBy, match.id);
    return;
  }
  const serialized = JSON.stringify(match);
  const transaction = redis
    .multi()
    .set(matchKey(match.id), serialized, "EX", env.matchTtlSeconds)
    .set(inviteKey(match.inviteCode), match.id, "EX", env.matchTtlSeconds)
    .set(ownershipKey(match.createdBy), match.id, "EX", env.matchTtlSeconds);
  match.teams.forEach((team) =>
    team.players.forEach((player) =>
      transaction.set(
        membershipKey(player.userId),
        match.id,
        "EX",
        env.matchTtlSeconds,
      ),
    ),
  );
  await transaction.exec();
}

export async function getMatch(id: string): Promise<TeamMatch | null> {
  if (useMemoryStore) {
    const match = memory.get(id);
    return match ? structuredClone(match) : null;
  }
  const value = await redis.get(matchKey(id));
  return value ? (JSON.parse(value) as TeamMatch) : null;
}

export async function getMatchByInviteCode(code: string): Promise<TeamMatch | null> {
  const normalized = code.trim().toUpperCase();
  if (useMemoryStore) {
    const match = [...memory.values()].find(
      (candidate) => candidate.inviteCode === normalized,
    );
    return match ? structuredClone(match) : null;
  }
  const id = await redis.get(inviteKey(normalized));
  return id ? getMatch(id) : null;
}

export async function getActiveMatchForUser(
  userId: string,
): Promise<TeamMatch | null> {
  const ownedMatchId = useMemoryStore
    ? memoryOwnership.get(userId)
    : await redis.get(ownershipKey(userId));
  if (ownedMatchId) {
    const owned = await getMatch(ownedMatchId);
    if (owned?.redirectToMatchId) {
      const canonical = await getMatch(owned.redirectToMatchId);
      if (canonical) return canonical;
    }
    if (
      owned &&
      owned.status !== "FINISHED" &&
      !(owned.status === "CANCELLED" && !owned.redirectToMatchId)
    ) {
      return owned;
    }
    if (useMemoryStore) memoryOwnership.delete(userId);
    else await redis.del(ownershipKey(userId));
  }

  const matchId = useMemoryStore
    ? memoryMembership.get(userId)
    : await redis.get(membershipKey(userId));
  if (!matchId) return null;
  const match = await getMatch(matchId);
  if (match?.redirectToMatchId) {
    const canonical = await getMatch(match.redirectToMatchId);
    if (canonical) return canonical;
  }
  if (
    !match ||
    match.status === "FINISHED" ||
    (match.status === "CANCELLED" && !match.redirectToMatchId)
  ) {
    if (useMemoryStore) memoryMembership.delete(userId);
    else await redis.del(membershipKey(userId));
    return null;
  }
  return match;
}

export async function pointUsersToMatch(
  userIds: string[],
  matchId: string,
): Promise<void> {
  if (useMemoryStore) {
    userIds.forEach((userId) => memoryMembership.set(userId, matchId));
    return;
  }
  const transaction = redis.multi();
  userIds.forEach((userId) =>
    transaction.set(membershipKey(userId), matchId, "EX", env.matchTtlSeconds),
  );
  await transaction.exec();
}

export async function destroyStoredMatch(match: TeamMatch): Promise<void> {
  const userIds = match.teams.flatMap((team) =>
    team.players.map((player) => player.userId),
  );
  if (useMemoryStore) {
    memory.delete(match.id);
    if (memoryOwnership.get(match.createdBy) === match.id) {
      memoryOwnership.delete(match.createdBy);
    }
    userIds.forEach((userId) => {
      if (memoryMembership.get(userId) === match.id) memoryMembership.delete(userId);
    });
    return;
  }
  const transaction = redis
    .multi()
    .del(matchKey(match.id))
    .del(inviteKey(match.inviteCode))
    .del(ownershipKey(match.createdBy));
  if (match.difficulty) {
    transaction.zrem(queueKey(match.difficulty, match.desiredTeamCount), match.id);
  }
  for (const userId of userIds) {
    const indexedMatchId = await redis.get(membershipKey(userId));
    if (indexedMatchId === match.id) transaction.del(membershipKey(userId));
  }
  await transaction.exec();
}

export async function enqueueMatch(match: TeamMatch): Promise<void> {
  if (!match.difficulty) return;
  if (useMemoryStore) return;
  const key = queueKey(match.difficulty, match.desiredTeamCount);
  await redis
    .multi()
    .zadd(key, Date.parse(match.updatedAt), match.id)
    .expire(key, env.matchTtlSeconds)
    .exec();
}

export async function getWaitingMatches(
  difficulty: string,
  teamCount: number,
): Promise<TeamMatch[]> {
  if (useMemoryStore) {
    return [...memory.values()]
      .filter(
        (match) =>
          match.status === "MATCHMAKING" &&
          match.difficulty === difficulty &&
          match.desiredTeamCount === teamCount,
      )
      .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt))
      .map((match) => structuredClone(match));
  }
  const key = queueKey(difficulty, teamCount);
  const ids = await redis.zrange(key, 0, 99);
  if (ids.length === 0) return [];
  const values = await redis.mget(ids.map(matchKey));
  const matches = values
    .filter((value): value is string => Boolean(value))
    .map((value) => JSON.parse(value) as TeamMatch);
  const valid = matches.filter(
    (match) =>
      match.status === "MATCHMAKING" &&
      match.difficulty === difficulty &&
      match.desiredTeamCount === teamCount,
  );
  const validIds = new Set(valid.map((match) => match.id));
  const staleIds = ids.filter((id) => !validIds.has(id));
  if (staleIds.length) await redis.zrem(key, ...staleIds);
  return valid;
}

export async function dequeueMatches(matches: TeamMatch[]): Promise<void> {
  if (useMemoryStore || matches.length === 0) return;
  const first = matches[0];
  if (!first.difficulty) return;
  await redis.zrem(
    queueKey(first.difficulty, first.desiredTeamCount),
    ...matches.map((match) => match.id),
  );
}

export async function updateMatch(
  id: string,
  update: (match: TeamMatch) => TeamMatch,
): Promise<TeamMatch> {
  if (useMemoryStore) {
    const current = memory.get(id);
    if (!current) {
      throw Object.assign(new Error("Match not found"), { statusCode: 404 });
    }
    const next = update(structuredClone(current));
    next.version += 1;
    next.updatedAt = new Date().toISOString();
    memory.set(id, structuredClone(next));
    if (next.status !== "CANCELLED") {
      next.teams.forEach((team) =>
        team.players.forEach((player) => memoryMembership.set(player.userId, id)),
      );
    }
    return next;
  }
  const key = matchKey(id);
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await redis.watch(key);
    const current = await redis.get(key);
    if (!current) {
      await redis.unwatch();
      throw Object.assign(new Error("Match not found"), { statusCode: 404 });
    }

    const next = update(JSON.parse(current) as TeamMatch);
    next.version += 1;
    next.updatedAt = new Date().toISOString();
    const transaction = redis
      .multi()
      .set(key, JSON.stringify(next), "EX", env.matchTtlSeconds);
    if (next.status !== "CANCELLED") {
      next.teams.forEach((team) =>
        team.players.forEach((player) =>
          transaction.set(
            membershipKey(player.userId),
            id,
            "EX",
            env.matchTtlSeconds,
          ),
        ),
      );
    }
    const result = await transaction.exec();
    if (result) return next;
  }
  throw Object.assign(new Error("Match changed; please try again"), {
    statusCode: 409,
  });
}

export async function withMatchmakingLock<T>(
  work: () => Promise<T>,
): Promise<T | null> {
  if (useMemoryStore) {
    if (memoryMatchmakingLocked) return null;
    memoryMatchmakingLocked = true;
    try {
      return await work();
    } finally {
      memoryMatchmakingLocked = false;
    }
  }

  const token = `${process.pid}:${Date.now()}:${Math.random()}`;
  const acquired = await redis.set(matchmakingLockKey, token, "PX", 5000, "NX");
  if (acquired !== "OK") return null;
  try {
    return await work();
  } finally {
    await redis.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      1,
      matchmakingLockKey,
      token,
    );
  }
}
