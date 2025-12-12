import { Request, Response } from 'express';
import { Candidate, Job } from '@prisma/client';
import {
  generateJobDescription,
  scoreCandidate,
  generateOutreach,
  generateSummary,
} from '../services/aiService';

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const buildJobPayload = (jobInput: any): Job | null => {
  if (
    !jobInput ||
    !isNonEmptyString(jobInput.title) ||
    !isNonEmptyString(jobInput.company) ||
    !isNonEmptyString(jobInput.location) ||
    !isNonEmptyString(jobInput.seniority) ||
    !isNonEmptyString(jobInput.description)
  ) {
    return null;
  }

  return {
    id: jobInput.id ?? 'generated-id',
    userId: jobInput.userId ?? 'generated-user',
    title: jobInput.title,
    company: jobInput.company,
    location: jobInput.location,
    seniority: jobInput.seniority,
    salaryMin: jobInput.salaryMin ?? null,
    salaryMax: jobInput.salaryMax ?? null,
    description: jobInput.description,
    requiredSkills: jobInput.requiredSkills ?? [],
    niceToHaveSkills: jobInput.niceToHaveSkills ?? [],
    createdAt: jobInput.createdAt ? new Date(jobInput.createdAt) : new Date(),
  };
};

const buildCandidatePayload = (candidateInput: any): Candidate | null => {
  if (!candidateInput || !isNonEmptyString(candidateInput.fullName)) {
    return null;
  }

  return {
    id: candidateInput.id ?? 'generated-id',
    userId: candidateInput.userId ?? 'generated-user',
    fullName: candidateInput.fullName,
    email: candidateInput.email ?? null,
    phone: candidateInput.phone ?? null,
    location: candidateInput.location ?? null,
    resumeUrl: candidateInput.resumeUrl ?? null,
    headline: candidateInput.headline ?? null,
    rawText: candidateInput.rawText ?? null,
    skills: candidateInput.skills ?? [],
    experience: candidateInput.experience ?? [],
    education: candidateInput.education ?? [],
    yearsOfExperience: candidateInput.yearsOfExperience ?? null,
    parseStatus: candidateInput.parseStatus ?? 'PENDING',
    parseError: candidateInput.parseError ?? null,
    createdAt: candidateInput.createdAt ? new Date(candidateInput.createdAt) : new Date(),
    jobCandidates: candidateInput.jobCandidates ?? [],
  };
};

export const generateJobDescriptionController = async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!isNonEmptyString(prompt)) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const jobDescription = await generateJobDescription(prompt);
    return res.json({ jobDescription });
  } catch (error) {
    console.error('Error generating job description:', error);
    return res.status(500).json({ error: 'Failed to generate job description' });
  }
};

export const scoreCandidateController = async (req: Request, res: Response) => {
  const { jobDescription, candidateText } = req.body;

  if (!isNonEmptyString(jobDescription) || !isNonEmptyString(candidateText)) {
    return res.status(400).json({ error: 'jobDescription and candidateText are required' });
  }

  try {
    const score = await scoreCandidate(jobDescription, candidateText);
    return res.json(score);
  } catch (error) {
    console.error('Error scoring candidate:', error);
    return res.status(500).json({ error: 'Failed to score candidate' });
  }
};

export const generateOutreachController = async (req: Request, res: Response) => {
  const { job, candidate } = req.body;

  const jobPayload = buildJobPayload(job);
  const candidatePayload = buildCandidatePayload(candidate);

  if (!jobPayload || !candidatePayload) {
    return res.status(400).json({ error: 'job and candidate with required fields are needed' });
  }

  try {
    const message = await generateOutreach(jobPayload, candidatePayload);
    return res.json({ message });
  } catch (error) {
    console.error('Error generating outreach message:', error);
    return res.status(500).json({ error: 'Failed to generate outreach' });
  }
};

export const generateSummaryController = async (req: Request, res: Response) => {
  const { job, candidate } = req.body;

  const jobPayload = buildJobPayload(job);
  const candidatePayload = buildCandidatePayload(candidate);

  if (!jobPayload || !candidatePayload) {
    return res.status(400).json({ error: 'job and candidate with required fields are needed' });
  }

  try {
    const summary = await generateSummary(jobPayload, candidatePayload);
    return res.json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    return res.status(500).json({ error: 'Failed to generate summary' });
  }
};
