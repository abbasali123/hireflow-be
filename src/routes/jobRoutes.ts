import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createJob,
  deleteJob,
  getJobById,
  getJobs,
  updateJob,
} from '../controllers/jobController';

const router = Router();

router.post('/', authMiddleware, createJob);
router.get('/', authMiddleware, getJobs);
router.get('/:id', authMiddleware, getJobById);
router.put('/:id', authMiddleware, updateJob);
router.delete('/:id', authMiddleware, deleteJob);

export default router;
