import { Request, Response, NextFunction } from 'express';
import { createSubmissionSchema, updateStatusSchema } from '../validators/submission.validator';
import * as submissionService from '../services/submission.service';
import * as aiService from '../services/ai.service';
import { enqueueSubmission } from '../queue/producer';
import type { SupportedLanguage } from '@codeforge/shared-types';
import { prisma } from '../prisma/client';

export async function createSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSubmissionSchema.parse(req.body);
    const submission = await submissionService.createSubmission(req.user!.id, input);

    let problemSlug: string | undefined;
    let testCases: { input: string; expectedOutput: string; isHidden: boolean }[] | undefined;
    
    if (submission.problemId) {
      const problem = await prisma.problem.findUnique({ 
        where: { id: submission.problemId },
        include: { testCases: { orderBy: { order: 'asc' } } }
      });
      if (problem) {
        problemSlug = problem.slug;
        testCases = problem.testCases.map(tc => ({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden
        }));
      }
    }

    await enqueueSubmission({
      submissionId: submission.id,
      userId: submission.userId,
      roomId: submission.roomId || undefined,
      language: submission.language as SupportedLanguage,
      sourceCode: submission.sourceCode,
      problemSlug,
      testCases,
    });

    res.status(201).json({ submission });
  } catch (err) {
    next(err);
  }
}

export async function getSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const submission = await submissionService.getSubmissionById(req.params.id);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }
    res.json({ submission });
  } catch (err) {
    next(err);
  }
}

export async function listSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const submissions = await submissionService.getUserSubmissions(req.user!.id);
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
}

export async function getRoomSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Optional: add authorization to check if user is in room. For now, just fetch.
    const submissions = await submissionService.getRoomSubmissions(req.params.roomId);
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const internalKey = req.headers['x-internal-key'];
    if (internalKey !== 'execution-service') {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const input = updateStatusSchema.parse(req.body);
    const submission = await submissionService.updateSubmissionStatus(req.params.id, input);
    res.json({ submission });
  } catch (err) {
    next(err);
  }
}

export async function getFeedback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const feedback = await aiService.generateFeedback(req.params.id);
    res.json({ feedback });
  } catch (err) {
    next(err);
  }
}
