import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  listProblems,
  getProblem,
  getDraft,
  saveDraft,
  deleteDraft,
  createProblem,
} from "../controllers/problem.controller";
import { authorize } from "../middleware/authorize";
import { Role } from "@prisma/client";
import shuffleRouter from "./shuffle.routes";

const router = Router();
router.use("/shuffle", shuffleRouter);

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
router.delete("/:slug/draft", authenticate, deleteDraft);

export default router;
