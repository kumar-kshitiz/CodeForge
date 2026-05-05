import { Router } from 'express';
import { authenticate } from '../middleware/authenticate';
import {
  createSubmission,
  getSubmission,
  listSubmissions,
  updateStatus,
  getFeedback,
} from '../controllers/submission.controller';

const router = Router();

router.post('/', authenticate, createSubmission);
router.get('/', authenticate, listSubmissions);
router.get('/:id', authenticate, getSubmission);
router.get('/:id/feedback', authenticate, getFeedback);
router.patch('/:id/status', updateStatus);

export default router;
