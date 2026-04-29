import { redis } from '../config/redis';
import type { RoomUser } from '@codeforge/shared-types';

const PRESENCE_TTL = 3600;

function presenceKey(roomId: string): string {
  return `room:${roomId}:users`;
}

function codeKey(roomId: string): string {
  return `room:${roomId}:code`;
}

function langKey(roomId: string): string {
  return `room:${roomId}:lang`;
}

export async function addUserToRoom(roomId: string, user: RoomUser): Promise<void> {
  await redis.hset(presenceKey(roomId), user.socketId, JSON.stringify(user));
  await redis.expire(presenceKey(roomId), PRESENCE_TTL);
}

export async function removeUserFromRoom(roomId: string, socketId: string): Promise<void> {
  await redis.hdel(presenceKey(roomId), socketId);
}

export async function getRoomUsers(roomId: string): Promise<RoomUser[]> {
  const raw = await redis.hgetall(presenceKey(roomId));
  if (!raw) return [];
  return Object.values(raw).map((v) => JSON.parse(v) as RoomUser);
}

export async function setRoomCode(roomId: string, code: string, language: string): Promise<void> {
  await redis.set(codeKey(roomId), code, 'EX', PRESENCE_TTL);
  await redis.set(langKey(roomId), language, 'EX', PRESENCE_TTL);
}

export async function getRoomCode(roomId: string): Promise<{ code: string; language: string } | null> {
  const [code, language] = await Promise.all([
    redis.get(codeKey(roomId)),
    redis.get(langKey(roomId)),
  ]);
  if (code === null) return null;
  return { code, language: language ?? 'javascript' };
}
