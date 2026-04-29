import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { createRoom, getRoom, listRooms, saveSnapshot, getSnapshot } from '../controllers/room.controller';

const router = Router();

router.post('/', authenticate, createRoom);
router.get('/', authenticate, listRooms);
router.get('/:id', authenticate, getRoom);
router.post('/:id/snapshot', saveSnapshot);
router.get('/:id/snapshot', authenticate, getSnapshot);

export default router;
