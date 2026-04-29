import { Router } from 'express';
import authRouter from './auth.routes';
import healthRouter from './health';
import roomRouter from './room.routes';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/rooms', roomRouter);

export default router;
