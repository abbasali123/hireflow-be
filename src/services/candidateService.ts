import prisma from '../prismaClient';
import { ParsedResume } from './aiResumeParser';

type ParseStatus = 'SUCCESS' | 'FAILED';

export const createCandidateFromParsedResume = async (
  userId: string,
  file: Express.Multer.File,
  rawText: string,
  parsed: ParsedResume,
  parseStatus: ParseStatus,
  parseError?: string,
) => {
  const candidate = await prisma.candidate.create({
    data: {
      userId,
      fullName: parsed.fullName,
      email: parsed.email,
      phone: parsed.phone,
      location: parsed.location,
      headline: parsed.headline,
      resumeUrl: file.path ?? null,
      rawText,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      yearsOfExperience: parsed.yearsOfExperience,
      atsScore: parsed.atsScore,
      parseStatus,
      parseError: parseError ?? null,
    },
  });

  return candidate;
};
