import { prisma } from '../prisma/client';
import type { CreateSubmissionInput, UpdateStatusInput } from '../validators/submission.validator';
import { SubmissionStatus } from '@prisma/client';
import { redisPublisher } from '../redis/pubsub';
import { SocketEvent } from '@codeforge/shared-types';

export async function createSubmission(userId: string, input: CreateSubmissionInput) {
  const submission = await prisma.submission.create({
    data: {
      userId,
      language: input.language,
      sourceCode: input.sourceCode,
      problemId: input.problemId ?? null,
      roomId: input.roomId ?? null,
      status: SubmissionStatus.PENDING,
    },
  });

  if (submission.roomId) {
    redisPublisher.publish('execution-updates', JSON.stringify({
      roomId: submission.roomId,
      event: SocketEvent.SUBMISSION_QUEUED,
      payload: submission,
    }));
  }

  return submission;
}

export async function getSubmissionById(id: string) {
  return prisma.submission.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true } },
    },
  });
}

export async function getUserSubmissions(userId: string) {
  return prisma.submission.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}

export async function getRoomSubmissions(roomId: string) {
  return prisma.submission.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, username: true } },
    },
    take: 50,
  });
}

export async function updateSubmissionStatus(id: string, input: UpdateStatusInput) {
  const submission = await prisma.submission.update({
    where: { id },
    data: {
      status: input.status as SubmissionStatus,
      verdict: input.verdict,
      stdout: input.stdout,
      stderr: input.stderr,
      executionTimeMs: input.executionTimeMs,
    },
  });

  if (submission.roomId) {
    let eventName = SocketEvent.SUBMISSION_PROCESSING;
    if (submission.status === 'COMPLETED') eventName = SocketEvent.SUBMISSION_COMPLETED;
    if (submission.status === 'FAILED') eventName = SocketEvent.SUBMISSION_FAILED;

    redisPublisher.publish('execution-updates', JSON.stringify({
      roomId: submission.roomId,
      event: eventName,
      payload: submission,
    }));
  }

  return submission;
}

