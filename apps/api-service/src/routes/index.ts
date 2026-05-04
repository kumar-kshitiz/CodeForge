import { Router } from 'express';
import authRouter from './auth.routes';
import healthRouter from './health';
import roomRouter from './room.routes';
import submissionRouter from './submission.routes';
import problemRouter from './problem.routes';
import contestRouter from './contest.routes';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/rooms', roomRouter);
router.use('/submissions', submissionRouter);
router.use('/problems', problemRouter);
router.use('/contests', contestRouter);

export default router;

