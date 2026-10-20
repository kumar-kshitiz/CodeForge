import { Router } from 'express';
import authRouter from './auth.routes';
import healthRouter from './health';
import submissionRouter from './submission.routes';
import problemRouter from './problem.routes';
import internalRouter from './internal.routes';
import abilityPuzzleRouter from './ability-puzzle.routes';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/submissions', submissionRouter);
router.use('/problems', problemRouter);
router.use('/internal', internalRouter);
router.use('/ability-puzzles', abilityPuzzleRouter);

export default router;
