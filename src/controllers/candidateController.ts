import { Request, RequestHandler, Response } from 'express';
import prisma from '../prismaClient';
import { aiParseResume, ParsedResume } from '../services/aiResumeParser';
import { createCandidateFromParsedResume } from '../services/candidateService';
import { normalizeParsedResume } from '../services/resumeNormalizer';
import { extractTextFromResume } from '../services/resumeTextExtractor';
import { CandidateExtraction, extractCandidateData } from '../utils/resumeParser';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

type UploadRequest = Request & { file?: Express.Multer.File };

type BasicCandidatePayload = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  headline?: string | null;
  resumeUrl?: string | null;
  rawText?: string | null;
  skills?: unknown;
  experience?: unknown;
  education?: unknown;
  yearsOfExperience?: number | null;
  atsScore?: number | null;
  parseStatus?: string;
  parseError?: string | null;
};

const emptyParsedResume = (): ParsedResume => ({
  fullName: null,
  email: null,
  phone: null,
  location: null,
  headline: null,
  atsScore: null,
  skills: [],
  experience: [],
  education: [],
  yearsOfExperience: null,
});

const mapFallbackExtractionToParsed = (fallback: CandidateExtraction): ParsedResume => ({
  fullName: fallback.fullName || null,
  email: null,
  phone: null,
  location: null,
  headline: null,
  atsScore: null,
  skills: fallback.skills ?? [],
  experience: (fallback.experience ?? []).map((entry) => ({
    company: null,
    title: null,
    startDate: null,
    endDate: null,
    location: null,
    description: entry?.trim() || null,
  })),
  education: (fallback.education ?? []).map((entry) => ({
    institution: entry?.trim() || null,
    degree: null,
    fieldOfStudy: null,
    startDate: null,
    endDate: null,
  })),
  yearsOfExperience: null,
});

export const createCandidate = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    fullName,
    email,
    phone,
    location,
    headline,
    skills,
    experience,
    education,
    resumeUrl,
    rawText,
    yearsOfExperience,
    atsScore,
    parseStatus,
    parseError,
  }: BasicCandidatePayload = req.body;

  if (!fullName) {
    return res.status(400).json({ error: 'Full name is required' });
  }

  try {
    const candidate = await prisma.candidate.create({
      data: {
        userId: req.user.id,
        fullName,
        email: email ?? null,
        phone: phone ?? null,
        location: location ?? null,
        headline: headline ?? null,
        resumeUrl: resumeUrl ?? null,
        rawText: rawText ?? null,
        skills: (skills as any) ?? [],
        experience: (experience as any) ?? [],
        education: (education as any) ?? [],
        yearsOfExperience: yearsOfExperience ?? null,
        atsScore: atsScore ?? null,
        parseStatus: parseStatus ?? undefined,
        parseError: parseError ?? null,
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
  const {
    fullName,
    email,
    phone,
    location,
    headline,
    skills,
    experience,
    education,
    resumeUrl,
    rawText,
    yearsOfExperience,
    atsScore,
    parseStatus,
    parseError,
  }: BasicCandidatePayload = req.body;

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
        email: email ?? null,
        phone: phone ?? null,
        location: location ?? null,
        headline: headline ?? null,
        skills: (skills as any) ?? existingCandidate.skills,
        experience: (experience as any) ?? existingCandidate.experience,
        education: (education as any) ?? existingCandidate.education,
        resumeUrl: resumeUrl ?? existingCandidate.resumeUrl,
        rawText: rawText ?? existingCandidate.rawText,
        yearsOfExperience: yearsOfExperience ?? existingCandidate.yearsOfExperience,
        atsScore: atsScore ?? existingCandidate.atsScore,
        parseStatus: parseStatus ?? existingCandidate.parseStatus,
        parseError: parseError ?? existingCandidate.parseError,
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

export const uploadResumeHandler: RequestHandler = async (req: UploadRequest, res, next) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  let extractionText = '';

  try {
    const extraction = await extractTextFromResume(file);
    extractionText = extraction.text;

    if (extraction.isScannedLike) {
      const parseError =
        'Resume appears to be scanned or contains too little text. Please upload a text-based PDF or DOCX.';
      const candidate = await createCandidateFromParsedResume(
        userId,
        file,
        extraction.text,
        emptyParsedResume(),
        'FAILED',
        parseError,
      );

      return res.status(422).json({ message: parseError, candidate });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not extract text from resume';

    try {
      const candidate = await createCandidateFromParsedResume(
        userId,
        file,
        extractionText,
        emptyParsedResume(),
        'FAILED',
        message,
      );

      return res.status(400).json({ error: message, candidate });
    } catch (dbError) {
      return next(dbError);
    }
  }

  try {
    const parsed = await aiParseResume(extractionText);
    const normalized = normalizeParsedResume(parsed, extractionText);
    const candidate = await createCandidateFromParsedResume(
      userId,
      file,
      extractionText,
      normalized,
      'SUCCESS',
    );

    return res.status(201).json(candidate);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to parse resume';

    try {
      const fallbackExtraction = await extractCandidateData(file);
      const fallbackParsed = mapFallbackExtractionToParsed(fallbackExtraction);
      const normalizedFallback = normalizeParsedResume(fallbackParsed, fallbackExtraction.rawText);
      const candidate = await createCandidateFromParsedResume(
        userId,
        file,
        fallbackExtraction.rawText,
        normalizedFallback,
        'FAILED',
        message,
      );

      return res.status(201).json({
        message: 'AI parsing failed; saved fallback extraction instead.',
        candidate,
      });
    } catch (fallbackError) {
      const fallbackMessage =
        fallbackError instanceof Error ? fallbackError.message : 'Failed to process resume';

      try {
        const candidate = await createCandidateFromParsedResume(
          userId,
          file,
          extractionText,
          emptyParsedResume(),
          'FAILED',
          `${message}; fallback also failed: ${fallbackMessage}`,
        );

        return res.status(500).json({ error: message, candidate });
      } catch (dbError) {
        return next(dbError);
      }
    }
  }
};
