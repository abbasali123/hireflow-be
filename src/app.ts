import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { register, login } from './controllers/authController';
import { authMiddleware } from './middleware/authMiddleware';
import { uploadCandidate } from './controllers/candidateController';
import {
  generateJobDescriptionController,
  scoreCandidateController,
  generateOutreachController,
  generateSummaryController,
} from './controllers/aiController';
import { upload } from './middleware/uploadMiddleware';
import jobRoutes from './routes/jobRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.post('/auth/register', register);
app.post('/auth/login', login);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/protected', authMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Access granted', user: req.user });
});

app.post('/candidates/upload', authMiddleware, upload.single('resume'), uploadCandidate);
app.post('/ai/generate-jd', authMiddleware, generateJobDescriptionController);
app.post('/ai/score-candidate', authMiddleware, scoreCandidateController);
app.post('/ai/generate-outreach', authMiddleware, generateOutreachController);
app.post('/ai/generate-summary', authMiddleware, generateSummaryController);

app.use('/jobs', jobRoutes);

export default app;
