import { prisma } from '../prisma/client';
import type { CreateSubmissionInput, UpdateStatusInput } from '../validators/submission.validator';
import { SubmissionStatus } from '@prisma/client';

export async function createSubmission(userId: string, input: CreateSubmissionInput) {
  return prisma.submission.create({
    data: {
      userId,
      language: input.language,
      sourceCode: input.sourceCode,
      problemId: input.problemId ?? null,
      status: SubmissionStatus.PENDING,
    },
  });
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

export async function updateSubmissionStatus(id: string, input: UpdateStatusInput) {
  return prisma.submission.update({
    where: { id },
    data: {
      status: input.status as SubmissionStatus,
      verdict: input.verdict,
      stdout: input.stdout,
      stderr: input.stderr,
      executionTimeMs: input.executionTimeMs,
    },
  });
}
