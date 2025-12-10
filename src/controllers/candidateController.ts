import { Request, Response } from 'express';
import fs from 'fs/promises';
import prisma from '../prismaClient';
import { extractCandidateData } from '../utils/resumeParser';

type UploadRequest = Request & { file?: Express.Multer.File };

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

    return res.status(201).json(candidate);
  } catch (error) {
    console.error('Error uploading candidate:', error);
    return res.status(500).json({ error: 'Failed to process resume' });
  } finally {
    try {
      await fs.unlink(file.path);
    } catch (cleanupError) {
      console.error('Error cleaning up uploaded file:', cleanupError);
    }
  }
};
