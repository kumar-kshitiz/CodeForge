import { Router } from "express";
import { env } from "../config/env";
import { prisma } from "../prisma/client";

const router = Router();

router.use((req, res, next) => {
  if (req.header("x-internal-key") !== env.internalServiceKey) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
});

router.get("/team-questions", async (req, res, next) => {
  try {
    const difficulty = String(req.query.difficulty ?? "").trim();
    const questions = await prisma.problem.findMany({
      where: {
        status: "PUBLISHED",
        kind: "QUESTION",
        ...(difficulty ? { difficulty: { equals: difficulty, mode: "insensitive" } } : {}),
      },
      select: {
        id: true,
        slug: true,
        title: true,
        difficulty: true,
        tags: { select: { name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 24,
    });
    res.json({ questions });
  } catch (error) {
    next(error);
  }
});

router.get("/ability-puzzles", async (_req, res, next) => {
  try {
    const puzzles = await prisma.abilityPuzzle.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        prompt: true,
        options: true,
        correctOption: true,
        answerText: true,
        explanation: true,
      },
    });
    res.json({ puzzles });
  } catch (error) {
    next(error);
  }
});

export default router;
