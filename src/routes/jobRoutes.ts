import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createJobHandler,
  deleteJob,
  getJobById,
  getJobs,
  refreshJobMatchesHandler,
  updateJob,
} from '../controllers/jobController';

const router = Router();

router.post('/', authMiddleware, createJobHandler);
router.get('/', authMiddleware, getJobs);
router.post('/:id/refresh-matches', authMiddleware, refreshJobMatchesHandler);
router.get('/:id', authMiddleware, getJobById);
router.put('/:id', authMiddleware, updateJob);
router.delete('/:id', authMiddleware, deleteJob);

export default router;
