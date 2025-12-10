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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
