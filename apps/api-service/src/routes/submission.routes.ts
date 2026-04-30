import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  createSubmission,
  getSubmission,
  listSubmissions,
  updateStatus,
} from '../controllers/submission.controller';

const router = Router();

router.post('/', authenticate, createSubmission);
router.get('/', authenticate, listSubmissions);
router.get('/:id', authenticate, getSubmission);
router.patch('/:id/status', updateStatus);

export default router;
