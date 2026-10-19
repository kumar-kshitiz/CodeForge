import { prisma } from "../prisma/client";
import type { CreateProblemInput } from "../validators/problem.validator";
import { createInlineContentKey } from "../utils/content-key";

export async function createProblem(input: CreateProblemInput) {
  return prisma.problem.create({
    data: {
      slug: input.slug,
      title: input.title,
      difficulty: input.difficulty,
      statementMd: input.statementMd,
      constraintsMd: input.constraintsMd,
      timeLimitMs: input.timeLimitMs,
      memoryLimitMb: input.memoryLimitMb,
      status: input.status,
      kind: input.kind,
      challengeEndsAt:
        input.kind === "CHALLENGE" ? input.challengeEndsAt : null,
      publishAfterChallenge:
        input.kind === "CHALLENGE" && input.publishAfterChallenge,
      starterCode: input.starterCode,
      examples: {
        create: input.examples.map((example, position) => ({
          ...example,
          position,
        })),
      },
      testCases: {
        create: input.testCases.map((testCase, position) => ({
          visibility: testCase.visibility,
          inputKey: createInlineContentKey(testCase.inputText),
          expectedOutputKey: createInlineContentKey(
            testCase.expectedOutputText,
          ),
          points: testCase.points,
          groupId: testCase.groupId,
          position,
        })),
      },
      officialSolutions: {
        create: input.officialSolutions.map((solution) => ({
          language: solution.language,
          sourceKey: createInlineContentKey(solution.sourceCode),
          editorialMd: solution.editorialMd,
          visibility: solution.visibility,
        })),
      },
      tags: {
        connectOrCreate: input.tags.map((name) => ({
          where: { name },
          create: { name },
        })),
      },
    },
    include: {
      examples: { orderBy: { position: "asc" } },
      tags: { select: { name: true } },
    },
  });
}

export async function listProblems() {
  const now = new Date();
  const problems = await prisma.problem.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { kind: "QUESTION" },
        { kind: "CHALLENGE", challengeEndsAt: { gt: now } },
        {
          kind: "CHALLENGE",
          challengeEndsAt: { lte: now },
          publishAfterChallenge: true,
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      difficulty: true,
      kind: true,
      challengeEndsAt: true,
      publishAfterChallenge: true,
      tags: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return problems.map((problem) => {
    const challengeActive =
      problem.kind === "CHALLENGE" &&
      Boolean(problem.challengeEndsAt && problem.challengeEndsAt > now);
    return {
      ...problem,
      originalKind: problem.kind,
      kind: challengeActive ? "CHALLENGE" : "QUESTION",
      challengeActive,
    };
  });
}

export async function getProblemBySlug(slug: string) {
  const problem = await prisma.problem.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      tags: { select: { name: true } },
      examples: { orderBy: { position: "asc" } },
    },
  });

  if (!problem) return null;

  const now = new Date();
  const challengeEnded =
    problem.kind === "CHALLENGE" &&
    Boolean(problem.challengeEndsAt && problem.challengeEndsAt <= now);
  if (challengeEnded && !problem.publishAfterChallenge) return null;

  return {
    ...problem,
    originalKind: problem.kind,
    kind: challengeEnded ? "QUESTION" : problem.kind,
    challengeActive: problem.kind === "CHALLENGE" && !challengeEnded,
  };
}

export async function getDraft(
  userId: string,
  problemId: string,
  language: string,
) {
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

export async function saveDraft(
  userId: string,
  problemId: string,
  language: string,
  code: string,
) {
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
