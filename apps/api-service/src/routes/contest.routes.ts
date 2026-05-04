import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { listContests, getContest, joinContest, getLeaderboard } from '../controllers/contest.controller';

const router = Router();

router.get('/', authenticate, listContests);
router.get('/:id', authenticate, getContest);
router.post('/:id/join', authenticate, joinContest);
router.get('/:id/leaderboard', authenticate, getLeaderboard);

export default router;
