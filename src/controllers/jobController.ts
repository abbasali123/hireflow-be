import { Request, RequestHandler, Response } from 'express';
import prisma from '../prismaClient';
import { autoAttachTopCandidatesForJob } from '../services/autoAttachCandidatesService';

type JobRequestBody = {
  title?: string;
  company?: string;
  location?: string;
  seniority?: string;
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requiredSkills?: unknown;
  niceToHaveSkills?: unknown;
  status?: string;
};

const JOB_STATUSES = ['OPEN', 'CLOSED'] as const;
type JobStatus = (typeof JOB_STATUSES)[number];

const normalizeJobStatus = (status?: string): JobStatus => {
  if (!status) {
    return 'OPEN';
  }

  const normalized = status.toUpperCase();

  if (!JOB_STATUSES.includes(normalized as JobStatus)) {
    throw new Error('Invalid status');
  }

  return normalized as JobStatus;
};

export const createJobHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    title,
    company,
    location,
    seniority,
    salaryMin,
    salaryMax,
    description,
    requiredSkills,
    niceToHaveSkills,
    status,
  } = req.body as JobRequestBody;

  if (!title || !company || !location || !seniority || !description || !requiredSkills || !niceToHaveSkills) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  let normalizedStatus: JobStatus;
  try {
    normalizedStatus = normalizeJobStatus(status);
  } catch (error) {
    return res.status(400).json({ error: 'Status must be either OPEN or CLOSED' });
  }

  try {
    const job = await prisma.job.create({
      data: {
        title,
        company,
        location,
        seniority,
        salaryMin,
        salaryMax,
        description,
        requiredSkills,
        niceToHaveSkills,
        status: normalizedStatus,
        userId: req.user.id,
      },
    });

    // Trigger AI matching to auto-populate the pipeline for this job.
    autoAttachTopCandidatesForJob(req.user.id, job.id).catch((error) => {
      console.error('Error auto-attaching candidates for job', job.id, error);
    });

    return res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job:', error);
    return res.status(500).json({ error: 'Failed to create job' });
  }
};

export const getJobs = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const jobs = await prisma.job.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return res.status(500).json({ error: 'Failed to fetch jobs' });
  }
};

export const refreshJobMatchesHandler: RequestHandler = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    await autoAttachTopCandidatesForJob(req.user.id, id, { limit: 20, minScore: 50 });
    return res.status(200).json({ message: 'AI matches refreshed' });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 404) {
      return res.status(404).json({ error: 'Job not found' });
    }

    console.error('Error refreshing job matches:', error);
    return res.status(500).json({ error: 'Failed to refresh AI matches' });
  }
};

export const getJobById = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const job = await prisma.job.findFirst({ where: { id, userId: req.user.id } });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    return res.status(500).json({ error: 'Failed to fetch job' });
  }
};

export const updateJob = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const {
    title,
    company,
    location,
    seniority,
    salaryMin,
    salaryMax,
    description,
    requiredSkills,
    niceToHaveSkills,
    status,
  } = req.body as JobRequestBody;

  try {
    const existingJob = await prisma.job.findFirst({ where: { id, userId: req.user.id } });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const data: JobRequestBody = {};

    if (title !== undefined) data.title = title;
    if (company !== undefined) data.company = company;
    if (location !== undefined) data.location = location;
    if (seniority !== undefined) data.seniority = seniority;
    if (salaryMin !== undefined) data.salaryMin = salaryMin;
    if (salaryMax !== undefined) data.salaryMax = salaryMax;
    if (description !== undefined) data.description = description;
    if (requiredSkills !== undefined) data.requiredSkills = requiredSkills;
    if (niceToHaveSkills !== undefined) data.niceToHaveSkills = niceToHaveSkills;
    if (status !== undefined) {
      try {
        data.status = normalizeJobStatus(status);
      } catch (error) {
        return res.status(400).json({ error: 'Status must be either OPEN or CLOSED' });
      }
    }

    const updatedJob = await prisma.job.update({
      where: { id },
      data,
    });

    return res.json(updatedJob);
  } catch (error) {
    console.error('Error updating job:', error);
    return res.status(500).json({ error: 'Failed to update job' });
  }
};

export const deleteJob = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const existingJob = await prisma.job.findFirst({ where: { id, userId: req.user.id } });

    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    await prisma.job.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting job:', error);
    return res.status(500).json({ error: 'Failed to delete job' });
  }
};
