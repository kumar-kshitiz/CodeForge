import { Request, Response, NextFunction } from "express";
import * as problemService from "../services/problem.service";
import { createProblemSchema } from "../validators/problem.validator";

export async function createProblem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createProblemSchema.parse(req.body);
    const problem = await problemService.createProblem(input);
    res.status(201).json({ problem });
  } catch (err) {
    next(err);
  }
}

export async function listProblems(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(30, Math.max(1, Number.parseInt(String(req.query.limit ?? "12"), 10) || 12));
    const requestedType = String(req.query.type ?? "all");
    const type = (["all", "questions", "challenges"].includes(requestedType)
      ? requestedType
      : "all") as "all" | "questions" | "challenges";
    const difficulty = String(req.query.difficulty ?? "").trim() || undefined;
    const query = String(req.query.query ?? "").trim().slice(0, 100) || undefined;
    const result = await problemService.listProblems({
      page,
      limit,
      type,
      difficulty,
      query,
      userId: req.user!.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProblem(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const problem = await problemService.getProblemBySlug(req.params.slug);
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }
    res.json({ problem });
  } catch (err) {
    next(err);
  }
}

export async function getDraft(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const language = req.query.language as string;
    const problem = await problemService.getProblemBySlug(req.params.slug);
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    if (!language) {
      res.status(400).json({ error: "Language is required" });
      return;
    }

    const draft = await problemService.getDraft(
      req.user!.id,
      problem.id,
      language,
    );
    res.json({ draft });
  } catch (err) {
    next(err);
  }
}

export async function saveDraft(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { language, code } = req.body;
    const problem = await problemService.getProblemBySlug(req.params.slug);
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    if (!language || typeof code !== "string") {
      res.status(400).json({ error: "Language and code are required" });
      return;
    }

    const draft = await problemService.saveDraft(
      req.user!.id,
      problem.id,
      language,
      code,
    );
    res.json({ draft });
  } catch (err) {
    next(err);
  }
}

export async function deleteDraft(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const language = req.query.language;
    if (typeof language !== "string" || !language) {
      res.status(400).json({ error: "Language is required" });
      return;
    }

    const problem = await problemService.getProblemBySlug(req.params.slug);
    if (!problem) {
      res.status(404).json({ error: "Problem not found" });
      return;
    }

    await problemService.deleteDraft(req.user!.id, problem.id, language);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
