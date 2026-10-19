import { Request, Response, NextFunction } from "express";
import {
  createSubmissionSchema,
  updateStatusSchema,
} from "../validators/submission.validator";
import * as submissionService from "../services/submission.service";
import * as aiService from "../services/ai.service";
import { enqueueSubmission } from "../queue/producer";
import type { SupportedLanguage } from "@codeforge/shared-types";
import { prisma } from "../prisma/client";
import { resolveContentKey } from "../utils/content-key";
import { env } from "../config/env";

export async function createSubmission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createSubmissionSchema.parse(req.body);
    const submission = await submissionService.createSubmission(
      req.user!.id,
      input,
    );

    let problemSlug: string | undefined;
    let timeLimitMs = 2000;
    let memoryLimitMb = 256;
    let testCases;

    if (submission.problemId) {
      const problem = await prisma.problem.findUnique({
        where: { id: submission.problemId },
        include: { testCases: { orderBy: { position: "asc" } } },
      });
      if (problem) {
        problemSlug = problem.slug;
        timeLimitMs = problem.timeLimitMs;
        memoryLimitMb = problem.memoryLimitMb;
        const selectedTestCases =
          input.mode === "RUN"
            ? problem.testCases.filter((tc) => tc.visibility === "PUBLIC")
            : problem.testCases;

        testCases = selectedTestCases.map((tc) => ({
          id: tc.id,
          input: resolveContentKey(tc.inputKey),
          expectedOutput: resolveContentKey(tc.expectedOutputKey),
          visibility: tc.visibility as "PUBLIC" | "HIDDEN",
          points: tc.points,
          position: tc.position,
          groupId: tc.groupId ?? undefined,
        }));
      }
    }

    await enqueueSubmission({
      submissionId: submission.id,
      userId: submission.userId,
      language: submission.language as SupportedLanguage,
      sourceCode: input.sourceCode,
      problemSlug,
      timeLimitMs,
      memoryLimitMb,
      testCases,
    });

    res.status(201).json({ submission, mode: input.mode });
  } catch (err) {
    next(err);
  }
}

export async function getSubmission(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const submission = await submissionService.getSubmissionById(
      req.params.id,
      req.user!.id,
    );
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    res.json({ submission });
  } catch (err) {
    next(err);
  }
}

export async function listSubmissions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const problemId =
      typeof req.query.problemId === "string" ? req.query.problemId : undefined;
    const submissions = await submissionService.getUserSubmissions(
      req.user!.id,
      problemId,
    );
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const internalKey = req.headers["x-internal-key"];
    if (internalKey !== env.internalServiceKey) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const input = updateStatusSchema.parse(req.body);
    const submission = await submissionService.updateSubmissionStatus(
      req.params.id,
      input,
    );
    res.json({ submission });
  } catch (err) {
    next(err);
  }
}

export async function getFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const feedback = await aiService.generateFeedback(
      req.params.id,
      req.user!.id,
    );
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
}

export async function getErrorFeedback(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const feedback = await aiService.generateErrorFeedback(
      req.params.id,
      req.user!.id,
    );
    res.json({ feedback });
  } catch (err: any) {
    console.error("ERROR IN getErrorFeedback:", err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
}
