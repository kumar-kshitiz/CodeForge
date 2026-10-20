import { Prisma } from "@prisma/client";
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

export interface ProblemListOptions {
  page: number;
  limit: number;
  type: "all" | "questions" | "challenges";
  difficulty?: string;
  query?: string;
  userId: string;
}

export async function listProblems(options: ProblemListOptions) {
  const now = new Date();
  const available: Prisma.ProblemWhereInput = {
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
  };
  const typeFilter: Prisma.ProblemWhereInput = options.type === "challenges"
    ? { kind: "CHALLENGE", challengeEndsAt: { gt: now } }
    : options.type === "questions"
      ? {
          OR: [
            { kind: "QUESTION" },
            { kind: "CHALLENGE", challengeEndsAt: { lte: now }, publishAfterChallenge: true },
          ],
        }
      : {};
  const queryFilter: Prisma.ProblemWhereInput = options.query
    ? {
        OR: [
          { title: { contains: options.query, mode: "insensitive" } },
          { tags: { some: { name: { contains: options.query, mode: "insensitive" } } } },
        ],
      }
    : {};
  const where: Prisma.ProblemWhereInput = {
    AND: [
      available,
      typeFilter,
      queryFilter,
      ...(options.difficulty
        ? [{ difficulty: { equals: options.difficulty, mode: "insensitive" as const } }]
        : []),
    ],
  };

  const [problems, total] = await prisma.$transaction([
    prisma.problem.findMany({
    where,
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
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: (options.page - 1) * options.limit,
    take: options.limit,
  }),
    prisma.problem.count({ where }),
  ]);

  const problemIds = problems.map((problem) => problem.id);
  const [submissionCounts, acceptedCounts, userAcceptedCounts] = problemIds.length
    ? await Promise.all([
        prisma.submission.groupBy({
          by: ["problemId"],
          where: {
            problemId: { in: problemIds },
            mode: "SUBMIT",
            status: "COMPLETED",
          },
          _count: { _all: true },
        }),
        prisma.submission.groupBy({
          by: ["problemId"],
          where: {
            problemId: { in: problemIds },
            mode: "SUBMIT",
            status: "COMPLETED",
            verdict: "accepted",
          },
          _count: { _all: true },
        }),
        prisma.submission.groupBy({
          by: ["problemId"],
          where: {
            problemId: { in: problemIds },
            userId: options.userId,
            mode: "SUBMIT",
            status: "COMPLETED",
            verdict: "accepted",
          },
          _count: { _all: true },
        }),
      ])
    : [[], [], []];
  const attemptsByProblem = new Map(
    submissionCounts.map((entry) => [entry.problemId, entry._count._all]),
  );
  const acceptedByProblem = new Map(
    acceptedCounts.map((entry) => [entry.problemId, entry._count._all]),
  );
  const userSolvesByProblem = new Map(
    userAcceptedCounts.map((entry) => [entry.problemId, entry._count._all]),
  );

  const items = problems.map((problem) => {
    const challengeActive =
      problem.kind === "CHALLENGE" &&
      Boolean(problem.challengeEndsAt && problem.challengeEndsAt > now);
    return {
      ...problem,
      originalKind: problem.kind,
      kind: challengeActive ? "CHALLENGE" : "QUESTION",
      challengeActive,
      userSolveCount: userSolvesByProblem.get(problem.id) ?? 0,
      acceptanceRate: attemptsByProblem.get(problem.id)
        ? Math.round(
            ((acceptedByProblem.get(problem.id) ?? 0) /
              attemptsByProblem.get(problem.id)!) *
              1000,
          ) / 10
        : null,
    };
  });
  return {
    problems: items,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      hasMore: options.page * options.limit < total,
    },
  };
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

export async function deleteDraft(
  userId: string,
  problemId: string,
  language: string,
) {
  return prisma.codeDraft.deleteMany({
    where: { userId, problemId, language },
  });
}
