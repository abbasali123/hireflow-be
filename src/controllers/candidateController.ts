import { Request, Response } from 'express';
import fs from 'fs/promises';
import prisma from '../prismaClient';
import { extractCandidateData } from '../utils/resumeParser';
import { isS3Driver } from '../config/storageConfig';
import { uploadResumeToS3 } from '../utils/storageService';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

type UploadRequest = Request & { file?: Express.Multer.File };

export const createCandidate = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { fullName, email, phone, location, summary, skills, experience, education } = req.body;

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  try {
    const candidate = await prisma.candidate.create({
      data: {
        userId: req.user.id,
        fullName,
        email,
        phone,
        location,
        summary,
        skills: skills ?? [],
        experience: experience ?? [],
        education: education ?? [],
      },
    });

    return res.status(201).json(candidate);
  } catch (error) {
    console.error('Error creating candidate:', error);
    return res.status(500).json({ error: 'Failed to create candidate' });
  }
};

export const getCandidates = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const candidates = await prisma.candidate.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json(candidates);
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return res.status(500).json({ error: 'Failed to retrieve candidates' });
  }
};

export const getCandidateById = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    return res.json(candidate);
  } catch (error) {
    console.error('Error fetching candidate:', error);
    return res.status(500).json({ error: 'Failed to retrieve candidate' });
  }
};

export const updateCandidate = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const { fullName, email, phone, location, summary, skills, experience, education } = req.body;

  try {
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existingCandidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
        fullName,
        email,
        phone,
        location,
        summary,
        skills,
        experience,
        education,
      },
    });

    return res.json(candidate);
  } catch (error) {
    console.error('Error updating candidate:', error);
    return res.status(500).json({ error: 'Failed to update candidate' });
  }
};

export const deleteCandidate = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;

  try {
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        id,
        userId: req.user.id,
      },
    });

    if (!existingCandidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    await prisma.candidate.delete({ where: { id } });

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return res.status(500).json({ error: 'Failed to delete candidate' });
  }
};

export const uploadCandidate = async (req: UploadRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const candidateData = await extractCandidateData(file);

    const candidate = await prisma.candidate.create({
      data: {
        userId: req.user.id,
        fullName: candidateData.fullName,
        rawText: candidateData.rawText,
        skills: candidateData.skills,
        experience: candidateData.experience,
        education: candidateData.education,
      },
    });

    const s3Upload = await uploadResumeToS3(file);

    const responsePayload = s3Upload ? { ...candidate, resumeLocation: s3Upload.location } : candidate;

    return res.status(201).json(responsePayload);
  } catch (error) {
    console.error('Error uploading candidate:', error);
    return res.status(500).json({ error: 'Failed to process resume' });
  } finally {
    if (!isS3Driver && file.path) {
      try {
        await fs.unlink(file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up uploaded file:', cleanupError);
      }
    }
  }
};
