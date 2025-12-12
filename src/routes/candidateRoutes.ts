import { Router } from 'express';
import {
  createCandidate,
  deleteCandidate,
  getCandidates,
  getCandidateById,
  updateCandidate,
  uploadResumeHandler,
} from '../controllers/candidateController';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import path from 'path';

const upload = multer({
  dest: 'uploads/resumes',
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      const error = new Error('Unsupported file type');
      // @ts-expect-error Custom status for centralized error handler
      error.status = 400;
      cb(error);
    }
  },
});

const router = Router();

router.post('/upload', authMiddleware, upload.single('resume'), uploadResumeHandler);
router.post('/', authMiddleware, createCandidate);
router.get('/', authMiddleware, getCandidates);
router.get('/:id', authMiddleware, getCandidateById);
router.put('/:id', authMiddleware, updateCandidate);
router.delete('/:id', authMiddleware, deleteCandidate);

export default router;
