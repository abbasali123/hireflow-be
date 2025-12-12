import type { PrismaClient } from '@prisma/client';
import prisma from '../prismaClient';
import { MatchScoreResult, scoreCandidateForJob } from './aiMatchingService';

export interface AutoAttachOptions {
  limit?: number; // max number of candidates to attach
  minScore?: number; // minimum score to be attached
}

const DEFAULT_LIMIT = 20;
const DEFAULT_MIN_SCORE = 50;
const MAX_CANDIDATES_TO_SCORE = 200;
const SCORING_CONCURRENCY = 3;

const getPrismaClient = (): PrismaClient => prisma;

export async function autoAttachTopCandidatesForJob(
  userId: string,
  jobId: string,
  options: AutoAttachOptions = {},
): Promise<void> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;

  const prismaClient = getPrismaClient();

  const job = await prismaClient.job.findFirst({
    where: { id: jobId, userId },
  });

  if (!job) {
    const error = new Error('Job not found or access denied');
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const candidates = await prismaClient.candidate.findMany({
    where: { userId, rawText: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: MAX_CANDIDATES_TO_SCORE,
  });

  if (!candidates.length) {
    return;
  }

  const results: Array<{ candidateId: string } & MatchScoreResult> = [];

  for (let i = 0; i < candidates.length; i += SCORING_CONCURRENCY) {
    const batch = candidates.slice(i, i + SCORING_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (candidate) => {
        const match = await scoreCandidateForJob(job.description, candidate.rawText!);
        return {
          candidateId: candidate.id,
          score: match.score,
          explanation: match.explanation,
        };
      }),
    );

    results.push(...batchResults);
  }

  const sortedResults = results
    .filter((result) => result.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!sortedResults.length) {
    return;
  }

  for (const result of sortedResults) {
    const existing = await prismaClient.jobCandidate.findFirst({
      where: { jobId, candidateId: result.candidateId },
    });

    if (existing) {
      await prismaClient.jobCandidate.update({
        where: { id: existing.id },
        data: { matchScore: result.score },
      });
    } else {
      await prismaClient.jobCandidate.create({
        data: {
          jobId,
          candidateId: result.candidateId,
          status: 'SOURCED',
          matchScore: result.score,
        },
      });
    }
  }
}
