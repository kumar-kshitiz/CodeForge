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
      contestId: input.contestId ?? null,
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

  if (submission.contestId && submission.problemId && (submission.status === 'COMPLETED' || submission.status === 'FAILED')) {
    await handleContestSubmission(submission);
  }

  return submission;
}

async function handleContestSubmission(submission: any) {
  const contestId = submission.contestId!;
  const problemId = submission.problemId!;
  const userId = submission.userId;

  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    include: { problems: true },
  });
  if (!contest) return;

  const contestProblem = contest.problems.find(p => p.problemId === problemId);
  if (!contestProblem) return;

  const participant = await prisma.contestParticipant.findUnique({
    where: { contestId_userId: { contestId, userId } }
  });
  if (!participant) return;

  const prevAccepted = await prisma.contestSubmission.findFirst({
    where: { contestId, problemId, submission: { userId }, pointsAwarded: { gt: 0 } }
  });

  if (prevAccepted) return; // Already solved

  let pointsAwarded = 0;
  let penaltyTime = 0;

  if (submission.verdict === 'accepted') {
    pointsAwarded = contestProblem.points;
    const minutesElapsed = Math.floor((submission.createdAt.getTime() - contest.startTime.getTime()) / 60000);
    
    const wrongSubmissions = await prisma.submission.count({
      where: {
        contestId, problemId, userId, status: 'FAILED',
        createdAt: { lt: submission.createdAt }
      }
    });

    penaltyTime = minutesElapsed + (wrongSubmissions * 20);
    
    await prisma.contestParticipant.update({
      where: { id: participant.id },
      data: {
        score: { increment: pointsAwarded },
        penalty: { increment: penaltyTime }
      }
    });
  }

  await prisma.contestSubmission.create({
    data: {
      contestId, problemId, submissionId: submission.id, pointsAwarded, penaltyTime
    }
  });

  // Broadcast Leaderboard Update to redis
  const updatedParticipant = await prisma.contestParticipant.findUnique({
    where: { id: participant.id },
    include: { user: { select: { username: true } } }
  });

  redisPublisher.publish('execution-updates', JSON.stringify({
    roomId: `contest-${contestId}`,
    event: SocketEvent.CONTEST_LEADERBOARD_UPDATE,
    payload: updatedParticipant
  }));
}

