import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createRoom, getRoom, listRooms, saveSnapshot, getSnapshot } from '../controllers/room.controller';
import { getRoomSubmissions } from '../controllers/submission.controller';

const router = Router();

router.post('/', authenticate, createRoom);
router.get('/', authenticate, listRooms);
router.get('/:id', authenticate, getRoom);
router.post('/:id/snapshot', saveSnapshot);
router.get('/:id/snapshot', authenticate, getSnapshot);
router.get('/:roomId/submissions', authenticate, getRoomSubmissions);

export default router;
