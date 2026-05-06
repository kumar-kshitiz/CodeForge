import { Router } from 'express';
import * as replayController from '../controllers/replay.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// We might want to authorize users to ensure they only view replays for rooms they have access to.
// For now, we simply authenticate.
router.use(authenticate);

router.get('/:roomId', replayController.listSessions);
router.get('/session/:sessionId', replayController.getSessionTimeline);

export default router;
