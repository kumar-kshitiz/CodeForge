import { prisma } from '../prisma/client';
import type { CreateRoomInput, SnapshotInput } from '../validators/room.validator';

export async function createRoom(userId: string, input: CreateRoomInput) {
  return prisma.interviewRoom.create({
    data: {
      title: input.title,
      createdBy: userId,
    },
    include: { host: { select: { id: true, username: true, email: true } } },
  });
}

export async function getRoomById(roomId: string) {
  return prisma.interviewRoom.findUnique({
    where: { id: roomId },
    include: {
      host: { select: { id: true, username: true, email: true } },
      participants: {
        include: { user: { select: { id: true, username: true, email: true } } },
      },
    },
  });
}

export async function getUserRooms(userId: string) {
  return prisma.interviewRoom.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' },
    include: { host: { select: { id: true, username: true } } },
  });
}

export async function saveSnapshot(roomId: string, input: SnapshotInput) {
  return prisma.roomCodeSnapshot.create({
    data: {
      roomId,
      language: input.language,
      code: input.code,
    },
  });
}

export async function getLatestSnapshot(roomId: string) {
  return prisma.roomCodeSnapshot.findFirst({
    where: { roomId },
    orderBy: { savedAt: 'desc' },
  });
}
