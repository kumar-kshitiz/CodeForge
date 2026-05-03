import { prisma } from '../prisma/client';

export async function listProblems() {
  return prisma.problem.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      tags: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProblemBySlug(slug: string) {
  return prisma.problem.findUnique({
    where: { slug },
    include: {
      tags: { select: { name: true } },
    },
  });
}

export async function getDraft(userId: string, problemId: string, language: string) {
  return prisma.codeDraft.findUnique({
    where: {
      userId_problemId_language: {
        userId,
        problemId,
        language,
      },
    },
  });
}

export async function saveDraft(userId: string, problemId: string, language: string, code: string) {
  return prisma.codeDraft.upsert({
    where: {
      userId_problemId_language: {
        userId,
        problemId,
        language,
      },
    },
    update: { code },
    create: { userId, problemId, language, code },
  });
}
