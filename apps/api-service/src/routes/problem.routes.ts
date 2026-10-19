import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  listProblems,
  getProblem,
  getDraft,
  saveDraft,
  createProblem,
} from "../controllers/problem.controller";
import { authorize } from "../middleware/authorize";
import { Role } from "@prisma/client";

const router = Router();

router.get("/", authenticate, listProblems);
router.post(
  "/",
  authenticate,
  authorize(Role.ADMIN, Role.INTERVIEWER),
  createProblem,
);
router.get("/:slug", authenticate, getProblem);
router.get("/:slug/draft", authenticate, getDraft);
router.put("/:slug/draft", authenticate, saveDraft);

export default router;
