import { Router } from 'express';
import {
  createCandidate,
  deleteCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  uploadCandidate,
} from '../controllers/candidateController';
import { authMiddleware } from '../middleware/authMiddleware';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

router.post('/upload', authMiddleware, upload.single('resume'), uploadCandidate);
router.post('/', authMiddleware, createCandidate);
router.get('/', authMiddleware, getCandidates);
router.get('/:id', authMiddleware, getCandidateById);
router.put('/:id', authMiddleware, updateCandidate);
router.delete('/:id', authMiddleware, deleteCandidate);

export default router;
