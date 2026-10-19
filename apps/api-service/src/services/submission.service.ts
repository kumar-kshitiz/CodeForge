import { prisma } from "../prisma/client";
import type {
  CreateSubmissionInput,
  UpdateStatusInput,
} from "../validators/submission.validator";
import { SubmissionStatus } from "@prisma/client";
import { createInlineContentKey } from "../utils/content-key";

export async function createSubmission(
  userId: string,
  input: CreateSubmissionInput,
) {
  const problem = await prisma.problem.findFirst({
    where: { id: input.problemId, status: "PUBLISHED" },
    select: {
      id: true,
      kind: true,
      challengeEndsAt: true,
      publishAfterChallenge: true,
    },
  });
  const challengeEnded =
    problem?.kind === "CHALLENGE" &&
    Boolean(problem.challengeEndsAt && problem.challengeEndsAt <= new Date());
  if (!problem || (challengeEnded && !problem.publishAfterChallenge)) {
    const error = new Error("Problem not found or unavailable") as Error & {
      statusCode: number;
    };
    error.statusCode = 404;
    throw error;
  }

  const submission = await prisma.submission.create({
    data: {
      userId,
      language: input.language,
      mode: input.mode,
      sourceKey: createInlineContentKey(input.sourceCode),
      problemId: input.problemId,
      status: SubmissionStatus.PENDING,
    },
  });

  return submission;
}

export async function getSubmissionById(id: string, userId: string) {
  return prisma.submission.findUnique({
    where: { id, userId },
    select: {
      id: true,
      problemId: true,
      language: true,
      mode: true,
      scoreAwarded: true,
      status: true,
      verdict: true,
      stdout: true,
      stderr: true,
      runtimeMs: true,
      memoryKb: true,
      passedTestCases: true,
      totalTestCases: true,
      failedTestCase: true,
      createdAt: true,
      user: { select: { id: true, username: true } },
    },
  });
}

export async function getUserSubmissions(userId: string, problemId?: string) {
  return prisma.submission.findMany({
    where: {
      userId,
      mode: "SUBMIT",
      ...(problemId ? { problemId } : {}),
    },
    select: {
      id: true,
      problemId: true,
      language: true,
      mode: true,
      scoreAwarded: true,
      status: true,
      verdict: true,
      stdout: true,
      stderr: true,
      runtimeMs: true,
      memoryKb: true,
      passedTestCases: true,
      totalTestCases: true,
      failedTestCase: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function updateSubmissionStatus(
  id: string,
  input: UpdateStatusInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.submission.findUnique({
      where: { id },
      include: {
        problem: {
          include: { testCases: { select: { points: true } } },
        },
      },
    });
    if (!existing) {
      const error = new Error("Submission not found") as Error & {
        statusCode: number;
      };
      error.statusCode = 404;
      throw error;
    }

    let submission = await tx.submission.update({
      where: { id },
      data: {
        status: input.status as SubmissionStatus,
        verdict: input.verdict,
        stdout: input.stdout,
        stderr: input.stderr,
        runtimeMs: input.runtimeMs,
        memoryKb: input.memoryKb,
        passedTestCases: input.passedTestCases,
        totalTestCases: input.totalTestCases,
        failedTestCase: input.failedTestCase ?? undefined,
        runtimeIntelligence: input.runtimeIntelligence ?? undefined,
      },
    });

    if (input.testResults) {
      await tx.submissionTestResult.deleteMany({ where: { submissionId: id } });
      if (input.testResults.length > 0) {
        await tx.submissionTestResult.createMany({
          data: input.testResults.map((result) => ({
            submissionId: id,
            testCaseId: result.testCaseId,
            verdict: result.verdict,
            runtimeMs: result.runtimeMs,
            memoryKb: result.memoryKb,
          })),
        });
      }
    }

    const isFirstCompletion =
      input.status === "COMPLETED" &&
      existing.status !== SubmissionStatus.COMPLETED &&
      existing.status !== SubmissionStatus.FAILED;
    const isActiveChallenge =
      existing.problem.kind === "CHALLENGE" &&
      Boolean(
        existing.problem.challengeEndsAt &&
          existing.createdAt <= existing.problem.challengeEndsAt,
      );

    if (isFirstCompletion && isActiveChallenge) {
      const maximumScore = existing.problem.testCases.reduce(
        (total, testCase) => total + testCase.points,
        0,
      );
      const totalCases = input.totalTestCases ?? 0;
      const passedCases = input.passedTestCases ?? 0;
      const allPassed = totalCases > 0 && passedCases === totalCases;
      const progress = await tx.challengeProgress.findUnique({
        where: {
          problemId_userId: {
            problemId: existing.problemId,
            userId: existing.userId,
          },
        },
      });

      if (existing.mode === "RUN") {
        const runCount = (progress?.runCount ?? 0) + 1;
        const runPenalty = Math.max(0, runCount - 1) * 0.75;
        const currentScore = roundScore(
          Math.max(0, maximumScore - runPenalty),
        );
        const firstRunPassed =
          progress?.firstRunPassed || (runCount === 1 && allPassed);

        await tx.challengeProgress.upsert({
          where: {
            problemId_userId: {
              problemId: existing.problemId,
              userId: existing.userId,
            },
          },
          update: { runCount, firstRunPassed, currentScore },
          create: {
            problemId: existing.problemId,
            userId: existing.userId,
            runCount,
            firstRunPassed,
            currentScore,
          },
        });

        submission = await tx.submission.update({
          where: { id },
          data: { scoreAwarded: currentScore },
        });
      } else {
        const runCount = progress?.runCount ?? 0;
        const firstRunPassed = progress?.firstRunPassed ?? false;
        const runPenalty =
          Math.max(0, runCount - 1) * 0.75 +
          (runCount === 1 && !firstRunPassed ? 0.75 : 0);
        const passedRatio =
          totalCases > 0 ? Math.min(1, passedCases / totalCases) : 0;
        const accepted = input.verdict === "accepted" && allPassed;
        const qualifiesForFullScore =
          accepted && (runCount === 0 || (runCount === 1 && firstRunPassed));
        const scoreAwarded = roundScore(
          qualifiesForFullScore
            ? maximumScore
            : Math.max(0, maximumScore * passedRatio - runPenalty),
        );
        const submissionCount = (progress?.submissionCount ?? 0) + 1;
        const bestScore = Math.max(progress?.bestScore ?? 0, scoreAwarded);

        await tx.challengeProgress.upsert({
          where: {
            problemId_userId: {
              problemId: existing.problemId,
              userId: existing.userId,
            },
          },
          update: {
            submissionCount,
            currentScore: scoreAwarded,
            bestScore,
            ...(accepted && !progress?.solvedAt ? { solvedAt: new Date() } : {}),
          },
          create: {
            problemId: existing.problemId,
            userId: existing.userId,
            submissionCount,
            currentScore: scoreAwarded,
            bestScore,
            solvedAt: accepted ? new Date() : null,
          },
        });

        submission = await tx.submission.update({
          where: { id },
          data: { scoreAwarded },
        });
      }
    }

    return submission;
  });
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}
