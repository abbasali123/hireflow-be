import { Request, Response } from 'express';
import prisma from '../prismaClient';

export const linkCandidateToJob = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { jobId, candidateId } = req.params;

  try {
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId: req.user.id },
    });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const candidate = await prisma.candidate.findFirst({
      where: { id: candidateId, userId: req.user.id },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const jobCandidate = await prisma.jobCandidate.create({
      data: {
        jobId,
        candidateId,
        status: 'SOURCED',
        matchScore: null,
      },
    });

    return res.status(201).json(jobCandidate);
  } catch (error) {
    console.error('Error linking candidate to job:', error);
    return res.status(500).json({ error: 'Failed to link candidate to job' });
  }
};

export const getCandidatesForJob = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { jobId } = req.params;

  try {
    const job = await prisma.job.findFirst({ where: { id: jobId, userId: req.user.id } });

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const candidates = await prisma.jobCandidate.findMany({
      where: { jobId },
      include: { candidate: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(candidates);
  } catch (error) {
    console.error('Error fetching job candidates:', error);
    return res.status(500).json({ error: 'Failed to fetch job candidates' });
  }
};

export const updateJobCandidateStatus = async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { jobId, candidateId } = req.params;
  const { status, matchScore, notes } = req.body as {
    status?: string;
    matchScore?: number | null;
    notes?: string;
  };

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  try {
    const jobCandidate = await prisma.jobCandidate.findFirst({
      where: {
        jobId,
        candidateId,
        job: { userId: req.user.id },
      },
    });

    if (!jobCandidate) {
      return res.status(404).json({ error: 'Job candidate link not found' });
    }

    const data: { status: string; matchScore?: number | null; notes?: string } = { status };

    if (matchScore !== undefined) {
      data.matchScore = matchScore;
    }

    if (notes !== undefined) {
      data.notes = notes;
    }

    const updatedJobCandidate = await prisma.jobCandidate.update({
      where: { id: jobCandidate.id },
      data,
    });

    return res.json(updatedJobCandidate);
  } catch (error) {
    console.error('Error updating job candidate status:', error);
    return res.status(500).json({ error: 'Failed to update job candidate status' });
  }
};
