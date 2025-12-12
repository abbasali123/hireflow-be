import { ParsedResume } from './aiResumeParser';

const dedupeSkills = (skills: string[]): string[] => {
  const normalized = skills
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);

  return Array.from(new Set(normalized));
};

const coerceYearsOfExperience = (value: number | null): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const coerced = Math.max(0, Math.floor(Number(value)));

  return Number.isFinite(coerced) ? coerced : null;
};

const coerceAtsScore = (value: number | null): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const coerced = Math.max(0, Math.min(100, Math.round(Number(value))));

  return Number.isFinite(coerced) ? coerced : null;
};

const deriveNameFromRawText = (rawText: string): string | null => {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return null;
  }

  return lines[0].slice(0, 80);
};

export const normalizeParsedResume = (parsed: ParsedResume, rawText: string): ParsedResume => {
  const fullName = parsed.fullName ?? deriveNameFromRawText(rawText);

  return {
    ...parsed,
    fullName: fullName ?? null,
    headline: parsed.headline ?? null,
    location: parsed.location ?? null,
    email: parsed.email ?? null,
    phone: parsed.phone ?? null,
    skills: dedupeSkills(parsed.skills || []),
    experience: parsed.experience || [],
    education: parsed.education || [],
    yearsOfExperience: coerceYearsOfExperience(parsed.yearsOfExperience),
    atsScore: coerceAtsScore(parsed.atsScore ?? null),
  };
};
