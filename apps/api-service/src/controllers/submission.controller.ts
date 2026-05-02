import { Request, Response, NextFunction } from 'express';
import { createSubmissionSchema, updateStatusSchema } from '../validators/submission.validator';
import * as submissionService from '../services/submission.service';
import { enqueueSubmission } from '../queue/producer';
import type { SupportedLanguage } from '@codeforge/shared-types';

export async function createSubmission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const input = createSubmissionSchema.parse(req.body);
    const submission = await submissionService.createSubmission(req.user!.id, input);

    await enqueueSubmission({
      submissionId: submission.id,
      userId: submission.userId,
      roomId: submission.roomId || undefined,
      language: submission.language as SupportedLanguage,
      sourceCode: submission.sourceCode,
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
