import express, { Request, Response } from 'express';
import cors from 'cors';
import { getCurrentUser, login, register } from './controllers/authController';
import { authMiddleware } from './middleware/authMiddleware';
import {
  generateJobDescriptionController,
  scoreCandidateController,
  generateOutreachController,
  generateSummaryController,
} from './controllers/aiController';
import jobRoutes from './routes/jobRoutes';
import candidateRoutes from './routes/candidateRoutes';
import jobCandidateRoutes from './routes/jobCandidateRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

app.post('/auth/register', register);
app.post('/auth/login', login);
app.get('/auth/me', authMiddleware, getCurrentUser);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/protected', authMiddleware, (req: Request, res: Response) => {
  res.json({ message: 'Access granted', user: req.user });
});

app.post('/ai/generate-jd', authMiddleware, generateJobDescriptionController);
app.post('/ai/score-candidate', authMiddleware, scoreCandidateController);
app.post('/ai/generate-outreach', authMiddleware, generateOutreachController);
app.post('/ai/generate-summary', authMiddleware, generateSummaryController);

app.use('/jobs', jobRoutes);
app.use('/jobs', jobCandidateRoutes);
app.use('/candidates', candidateRoutes);

app.use(errorHandler);

export default app;
