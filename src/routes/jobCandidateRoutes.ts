import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  getCandidatesForJob,
  linkCandidateToJob,
  updateJobCandidateStatus,
} from '../controllers/jobCandidateController';

const router = Router();

router.post('/:jobId/candidates/:candidateId/link', authMiddleware, linkCandidateToJob);
router.get('/:jobId/candidates', authMiddleware, getCandidatesForJob);
router.put('/:jobId/candidates/:candidateId/status', authMiddleware, updateJobCandidateStatus);

export default router;
