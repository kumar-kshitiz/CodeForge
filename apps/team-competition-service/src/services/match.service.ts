import { randomBytes, randomInt, randomUUID } from "crypto";
import type {
  AuthUser,
  Difficulty,
  Player,
  Team,
  TeamMatch,
} from "../types/match";
import {
  dequeueMatches,
  destroyStoredMatch,
  enqueueMatch,
  getActiveMatchForUser,
  getMatch,
  getMatchByInviteCode,
  getWaitingMatches,
  pointUsersToMatch,
  saveMatch,
  updateMatch,
  withMatchmakingLock,
} from "../store/match.store";
import { getAbilityPuzzleCatalog, getQuestionCatalog } from "./catalog.service";

const TEAM_COLORS = ["#ff7452", "#6765f7", "#12a594", "#e6a21a"];

function fail(message: string, statusCode = 400): never {
  throw Object.assign(new Error(message), { statusCode });
}

function playerFrom(user: AuthUser): Player {
  return {
    userId: user.id,
    username: user.username,
    joinedAt: new Date().toISOString(),
    score: 0,
  };
}

export async function createMatch(
  user: AuthUser,
  input: { name: string; teamCount: number; durationMinutes: number },
): Promise<TeamMatch> {
  const existing = await getActiveMatchForUser(user.id);
  if (existing) {
    fail("You already have an active squad. Continue or destroy it first.", 409);
  }
  const now = new Date().toISOString();
  let inviteCode = "";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomBytes(5).toString("hex").toUpperCase();
    if (!(await getMatchByInviteCode(candidate))) {
      inviteCode = candidate;
      break;
    }
  }
  if (!inviteCode) fail("Could not reserve an invite code", 503);
  const teams: Team[] = [{
    id: randomUUID(),
    name: "Your squad",
    color: TEAM_COLORS[0],
    players: [playerFrom(user)],
    selectedQuestionIds: [],
    score: 0,
    abilityPuzzleScore: 0,
  }];
  const match: TeamMatch = {
    id: randomUUID(),
    inviteCode,
    name: input.name,
    createdBy: user.id,
    status: "LOBBY",
    durationMinutes: input.durationMinutes,
    desiredTeamCount: input.teamCount,
    teams,
    winnerTeamIds: [],
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  await saveMatch(match);
  return match;
}

export { getMatch };

export async function getCurrentMatch(userId: string): Promise<TeamMatch | null> {
  return getActiveMatchForUser(userId);
}

export async function joinMatchByCode(
  inviteCode: string,
  user: AuthUser,
): Promise<TeamMatch> {
  const invited = await getMatchByInviteCode(inviteCode);
  if (!invited) fail("Invite code not found", 404);
  const active = await getActiveMatchForUser(user.id);
  if (active?.id === invited.id) return active;
  if (active && active.createdBy !== user.id) {
    fail("You are already in another active squad", 409);
  }
  const matchId = invited.id;
  const joined = await updateMatch(matchId, (match) => {
    if (match.status !== "LOBBY") fail("This squad has already started", 409);
    const currentTeam = match.teams.find((team) =>
      team.players.some((player) => player.userId === user.id),
    );
    const target = match.teams[0];
    if (!target) fail("Squad not found", 404);
    if (target.players.length >= 8 && currentTeam?.id !== target.id) {
      fail("That team already has 8 players", 409);
    }
    match.teams.forEach((team) => {
      team.players = team.players.filter((player) => player.userId !== user.id);
    });
    target.players.push(playerFrom(user));
    return match;
  });
  // A creator may temporarily participate in another squad, while their own
  // squad remains the one restored on the dashboard.
  if (active?.createdBy === user.id) {
    await pointUsersToMatch([user.id], active.id);
  }
  return joined;
}

function assignLeadersAndDraftTargets(match: TeamMatch): void {
  match.teams.forEach((team, index) => {
    team.leaderId = team.players[randomInt(team.players.length)].userId;
    team.draftsForTeamId = match.teams[(index + 1) % match.teams.length].id;
    team.selectedQuestionIds = [];
  });
  match.status = "DRAFTING";
}

export async function voteDifficulty(
  matchId: string,
  difficulty: Difficulty,
  userId: string,
): Promise<TeamMatch> {
  return updateMatch(matchId, (match) => {
    if (match.status !== "LOBBY") fail("Difficulty is already locked", 409);
    const team = match.teams.find((candidate) =>
      candidate.players.some((player) => player.userId === userId),
    );
    if (!team) fail("Join a team before voting", 403);
    if (team.players.length < 3) {
      fail("Your squad needs at least 3 players before matchmaking can start", 409);
    }
    team.difficultyVote = difficulty;
    match.difficulty = difficulty;
    return match;
  });
}

export async function startMatchmaking(
  matchId: string,
  userId: string,
): Promise<TeamMatch> {
  await updateMatch(matchId, (match) => {
    if (match.status !== "LOBBY") fail("This squad has already started", 409);
    if (match.createdBy !== userId) {
      fail("Only the squad creator can start matchmaking", 403);
    }
    const squad = match.teams[0];
    if (!squad || squad.players.length < 3) {
      fail("Your squad needs at least 3 players before matchmaking can start", 409);
    }
    if (!match.difficulty || !squad.difficultyVote) {
      fail("Choose a difficulty before starting matchmaking", 409);
    }
    match.status = "MATCHMAKING";
    return match;
  });
  const queued = await getMatch(matchId);
  if (queued) await enqueueMatch(queued);
  await tryGlobalMatchmaking(matchId);
  const result = await getMatch(matchId);
  if (!result) fail("Match not found", 404);
  return result;
}

async function tryGlobalMatchmaking(triggerMatchId: string): Promise<void> {
  await withMatchmakingLock(async () => {
    const trigger = await getMatch(triggerMatchId);
    if (!trigger || trigger.status !== "MATCHMAKING" || !trigger.difficulty) return;

    const waiting = (await getWaitingMatches(
      trigger.difficulty,
      trigger.desiredTeamCount,
    ))
      .filter(
        (match) =>
          match.status === "MATCHMAKING" &&
          match.difficulty === trigger.difficulty &&
          match.desiredTeamCount === trigger.desiredTeamCount &&
          match.teams.length === 1,
      )
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    if (waiting.length < trigger.desiredTeamCount) return;

    const others = waiting.filter((match) => match.id !== trigger.id);
    const group = [trigger, ...others].slice(0, trigger.desiredTeamCount);
    if (group.length < trigger.desiredTeamCount) return;
    group.sort((left, right) => left.createdAt.localeCompare(right.createdAt));

    const canonical = group[0];
    const mergedTeams = group.map((waitingMatch, index) => ({
      ...waitingMatch.teams[0],
      name: `Team ${String.fromCharCode(65 + index)}`,
      color: TEAM_COLORS[index],
      difficultyVote: trigger.difficulty,
      selectedQuestionIds: [],
      score: 0,
      abilityPuzzleScore: 0,
    }));

    await updateMatch(canonical.id, (match) => {
      if (match.status !== "MATCHMAKING") {
        fail("Another matcher already claimed this squad", 409);
      }
      match.teams = mergedTeams;
      match.difficulty = trigger.difficulty;
      assignLeadersAndDraftTargets(match);
      return match;
    });

    for (const matched of group.slice(1)) {
      await updateMatch(matched.id, (match) => {
        match.status = "CANCELLED";
        match.redirectToMatchId = canonical.id;
        return match;
      });
    }
    await pointUsersToMatch(
      mergedTeams.flatMap((team) => team.players.map((player) => player.userId)),
      canonical.id,
    );
    await dequeueMatches(group);
  });
}

export async function destroySquad(
  matchId: string,
  userId: string,
): Promise<void> {
  const match = await getMatch(matchId);
  if (!match) fail("Squad not found", 404);
  if (match.createdBy !== userId) {
    fail("Only the squad creator can destroy it", 403);
  }
  if (match.status !== "LOBBY" && match.status !== "MATCHMAKING") {
    fail("This squad cannot be destroyed after opponents are matched", 409);
  }
  await destroyStoredMatch(match);
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomInt(index + 1);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

export async function submitDraft(
  matchId: string,
  questionIds: string[],
  userId: string,
): Promise<TeamMatch> {
  const snapshot = await getMatch(matchId);
  if (!snapshot) fail("Match not found", 404);
  if (snapshot.status !== "DRAFTING" || !snapshot.difficulty) {
    fail("This match is not drafting", 409);
  }
  const source = snapshot.teams.find((team) => team.leaderId === userId);
  if (!source) fail("Only the selected leader can submit a draft", 403);
  const target = snapshot.teams.find((team) => team.id === source.draftsForTeamId);
  if (!target) fail("Draft target is missing", 409);
  if (questionIds.length !== target.players.length) {
    fail(`Choose exactly ${target.players.length} questions`);
  }
  if (new Set(questionIds).size !== questionIds.length) {
    fail("Choose different questions for each player");
  }
  const catalog = await getQuestionCatalog(snapshot.difficulty);
  const catalogById = new Map(catalog.map((question) => [question.id, question]));
  if (questionIds.some((id) => !catalogById.has(id))) {
    fail("One or more questions are not available at this difficulty");
  }

  return updateMatch(matchId, (match) => {
    if (match.status !== "DRAFTING") fail("Drafting has ended", 409);
    const liveSource = match.teams.find((team) => team.leaderId === userId);
    const liveTarget = match.teams.find(
      (team) => team.id === liveSource?.draftsForTeamId,
    );
    if (!liveSource || !liveTarget) fail("Draft assignment is missing", 409);
    liveSource.selectedQuestionIds = questionIds;

    if (match.teams.every((team) => team.selectedQuestionIds.length > 0)) {
      match.teams.forEach((draftingTeam) => {
        const receivingTeam = match.teams.find(
          (team) => team.id === draftingTeam.draftsForTeamId,
        );
        if (!receivingTeam) return;
        shuffle(draftingTeam.selectedQuestionIds).forEach((questionId, index) => {
          const question = catalogById.get(questionId);
          const player = receivingTeam.players[index];
          if (player && question) {
            player.questionId = question.id;
            player.questionSlug = question.slug;
            player.questionTitle = question.title;
          }
        });
      });
      const startsAt = new Date();
      match.startsAt = startsAt.toISOString();
      match.endsAt = new Date(
        startsAt.getTime() + match.durationMinutes * 60_000,
      ).toISOString();
      match.status = "LIVE";
    }
    return match;
  });
}

export async function recordScore(input: {
  matchId: string;
  userId: string;
  problemId: string;
  passedTestCases: number;
  totalTestCases: number;
  verdict?: string;
}): Promise<TeamMatch> {
  return updateMatch(input.matchId, (match) => {
    if (match.status !== "LIVE") fail("Match is not live", 409);
    const team = match.teams.find((candidate) =>
      candidate.players.some((player) => player.userId === input.userId),
    );
    const player = team?.players.find((candidate) => candidate.userId === input.userId);
    if (!team || !player || player.questionId !== input.problemId) {
      fail("This question is not assigned to that player", 403);
    }
    if (team.abilityActivatedAt) {
      fail("Normal coding is locked while the final-five ability is active", 409);
    }
    const ratio = input.totalTestCases
      ? Math.min(1, input.passedTestCases / input.totalTestCases)
      : 0;
    const score = Math.round(ratio * 10000) / 100;
    if (score > player.score) {
      player.score = score;
      if (input.verdict === "accepted") player.solvedAt = new Date().toISOString();
    }
    team.score =
      team.players.reduce((total, member) => total + member.score, 0) +
      (team.abilityPuzzleScore ?? 0);
    if (match.endsAt && Date.now() >= Date.parse(match.endsAt)) {
      finishMatch(match);
    }
    return match;
  });
}

function requireLiveTeamForUser(match: TeamMatch, userId: string): Team {
  if (match.status !== "LIVE" || !match.endsAt || Date.now() >= Date.parse(match.endsAt)) {
    fail("The match is not live", 409);
  }
  const team = match.teams.find((candidate) =>
    candidate.players.some((player) => player.userId === userId),
  );
  if (!team) fail("You are not part of this match", 403);
  return team;
}

export async function validateCodingSubmission(input: {
  matchId: string;
  userId: string;
  problemId: string;
}): Promise<void> {
  const match = await getMatch(input.matchId);
  if (!match) fail("Match not found", 404);
  const team = requireLiveTeamForUser(match, input.userId);
  const player = team.players.find((candidate) => candidate.userId === input.userId);
  if (!player || player.questionId !== input.problemId) {
    fail("This coding question is not assigned to you", 403);
  }
  if (team.abilityActivatedAt) {
    fail("Your leader activated Final 5%. Normal coding is now locked.", 409);
  }
}

export async function activateAbility(
  matchId: string,
  userId: string,
): Promise<TeamMatch> {
  const puzzles = await getAbilityPuzzleCatalog();
  if (puzzles.length === 0) {
    fail("No active ability puzzles are available", 409);
  }
  return updateMatch(matchId, (match) => {
    const team = requireLiveTeamForUser(match, userId);
    if (team.leaderId !== userId) fail("Only the team leader can activate Final 5%", 403);
    const remaining = Date.parse(match.endsAt!) - Date.now();
    const unlockWindow = match.durationMinutes * 60_000 * 0.05;
    if (remaining > unlockWindow) {
      fail("Final 5% unlocks during the last 5% of the match", 409);
    }
    if (team.abilityActivatedAt) fail("Final 5% is already active", 409);
    team.abilityActivatedAt = new Date().toISOString();
    team.abilityPuzzleScore = team.abilityPuzzleScore ?? 0;
    team.currentPuzzleId = undefined;
    return match;
  });
}

export async function getAbilityPuzzle(matchId: string, userId: string) {
  const puzzles = await getAbilityPuzzleCatalog();
  if (puzzles.length === 0) fail("No active ability puzzles are available", 409);
  const snapshot = await getMatch(matchId);
  if (!snapshot) fail("Match not found", 404);
  const team = requireLiveTeamForUser(snapshot, userId);
  if (team.leaderId !== userId) fail("Only the team leader can play Final 5%", 403);
  if (!team.abilityActivatedAt) fail("Final 5% has not been activated", 409);

  let puzzle = puzzles.find((candidate) => candidate.id === team.currentPuzzleId);
  if (!puzzle) {
    const candidates = puzzles.filter((candidate) => candidate.id !== team.lastPuzzleId);
    const pool = candidates.length ? candidates : puzzles;
    puzzle = pool[randomInt(pool.length)];
    await updateMatch(matchId, (match) => {
      const liveTeam = requireLiveTeamForUser(match, userId);
      if (!liveTeam.abilityActivatedAt) fail("Final 5% has not been activated", 409);
      liveTeam.currentPuzzleId = puzzle!.id;
      return match;
    });
  }
  return {
    id: puzzle.id,
    prompt: puzzle.prompt,
    options: puzzle.options ?? null,
    responseType: puzzle.options?.length ? "CHOICE" : "TEXT",
  };
}

export async function answerAbilityPuzzle(
  matchId: string,
  userId: string,
  puzzleId: string,
  answer: { option?: number; answerText?: string },
) {
  const puzzles = await getAbilityPuzzleCatalog();
  const puzzle = puzzles.find((candidate) => candidate.id === puzzleId);
  if (!puzzle) fail("Puzzle is unavailable", 404);
  const correct = puzzle.options?.length
    ? answer.option === puzzle.correctOption
    : Boolean(
        puzzle.answerText &&
          answer.answerText?.trim().localeCompare(puzzle.answerText.trim(), undefined, {
            sensitivity: "base",
          }) === 0,
      );
  const match = await updateMatch(matchId, (current) => {
    const team = requireLiveTeamForUser(current, userId);
    if (team.leaderId !== userId) fail("Only the team leader can play Final 5%", 403);
    if (!team.abilityActivatedAt) fail("Final 5% has not been activated", 409);
    if (team.currentPuzzleId !== puzzleId) fail("This puzzle is no longer active", 409);
    if (correct) {
      team.abilityPuzzleScore = (team.abilityPuzzleScore ?? 0) + 1;
      team.score =
        team.players.reduce((total, player) => total + player.score, 0) +
        team.abilityPuzzleScore;
      team.lastPuzzleId = puzzleId;
      team.currentPuzzleId = undefined;
    }
    return current;
  });
  const team = match.teams.find((candidate) => candidate.leaderId === userId)!;
  return {
    correct,
    explanation: puzzle.explanation ?? null,
    abilityScore: team.abilityPuzzleScore,
  };
}

function finishMatch(match: TeamMatch): void {
  const bestScore = Math.max(...match.teams.map((team) => team.score));
  match.winnerTeamIds = match.teams
    .filter((team) => team.score === bestScore)
    .map((team) => team.id);
  match.status = "FINISHED";
}

export async function finishExpiredMatch(matchId: string): Promise<TeamMatch> {
  return updateMatch(matchId, (match) => {
    if (
      match.status === "LIVE" &&
      match.endsAt &&
      Date.now() >= Date.parse(match.endsAt)
    ) {
      finishMatch(match);
    }
    return match;
  });
}
