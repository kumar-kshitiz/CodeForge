import { Router } from "express";
import { Role } from "@prisma/client";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { prisma } from "../prisma/client";

const router = Router();
const puzzleSchema = z
  .object({
    prompt: z.string().trim().min(5).max(1000),
    options: z.array(z.string().trim().min(1).max(240)).min(2).max(6).optional(),
    correctOption: z.number().int().min(0).optional(),
    answerText: z.string().trim().min(1).max(240).optional(),
    explanation: z.string().trim().max(1000).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  })
  .superRefine((value, context) => {
    if (value.options?.length) {
      if (
        value.correctOption === undefined ||
        value.correctOption >= value.options.length
      ) {
        context.addIssue({
          code: "custom",
          message: "Select the correct supplied option",
          path: ["correctOption"],
        });
      }
      return;
    }
    if (!value.answerText) {
      context.addIssue({
        code: "custom",
        message: "A text answer is required when options are omitted",
        path: ["answerText"],
      });
    }
  });

router.use(authenticate, authorize(Role.ADMIN));

router.get("/", async (_req, res, next) => {
  try {
    const puzzles = await prisma.abilityPuzzle.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json({ puzzles });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const input = puzzleSchema.parse(req.body);
    const puzzle = await prisma.abilityPuzzle.create({ data: input });
    res.status(201).json({ puzzle });
  } catch (error) {
    next(error);
  }
});

export default router;
