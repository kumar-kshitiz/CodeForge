import { Request, Response, NextFunction } from 'express';
import * as problemService from '../services/problem.service';

export async function listProblems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const problems = await problemService.listProblems();
    res.json({ problems });
  } catch (err) {
    next(err);
  }
}

export async function getProblem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const problem = await problemService.getProblemBySlug(req.params.slug);
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }
    res.json({ problem });
  } catch (err) {
    next(err);
  }
}

export async function getDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const language = req.query.language as string;
    const problem = await problemService.getProblemBySlug(req.params.slug);
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    if (!language) {
      res.status(400).json({ error: 'Language is required' });
      return;
    }

    const draft = await problemService.getDraft(req.user!.id, problem.id, language);
    res.json({ draft });
  } catch (err) {
    next(err);
  }
}

export async function saveDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { language, code } = req.body;
    const problem = await problemService.getProblemBySlug(req.params.slug);
    if (!problem) {
      res.status(404).json({ error: 'Problem not found' });
      return;
    }

    if (!language || !code) {
      res.status(400).json({ error: 'Language and code are required' });
      return;
    }

    const draft = await problemService.saveDraft(req.user!.id, problem.id, language, code);
    res.json({ draft });
  } catch (err) {
    next(err);
  }
}
