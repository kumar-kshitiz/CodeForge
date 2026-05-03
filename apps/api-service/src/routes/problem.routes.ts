import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import { listProblems, getProblem, getDraft, saveDraft } from '../controllers/problem.controller';

const router = Router();

router.get('/', authenticate, listProblems);
router.get('/:slug', authenticate, getProblem);
router.get('/:slug/draft', authenticate, getDraft);
router.put('/:slug/draft', authenticate, saveDraft);

export default router;
