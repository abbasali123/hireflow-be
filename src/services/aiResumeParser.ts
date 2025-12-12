import OpenAI from 'openai';
import { z } from 'zod';

export interface ParsedResume {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  headline: string | null;
  atsScore: number | null;
  skills: string[];
  experience: {
    company: string | null;
    title: string | null;
    startDate: string | null;
    endDate: string | null;
    location: string | null;
    description: string | null;
  }[];
  education: {
    institution: string | null;
    degree: string | null;
    fieldOfStudy: string | null;
    startDate: string | null;
    endDate: string | null;
  }[];
  yearsOfExperience: number | null;
}

const MODEL_NAME = 'gpt-4.1-mini';

const parsedResumeSchema: z.ZodType<ParsedResume> = z.object({
  fullName: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
  email: z.string().trim().email().optional().nullable().transform((v) => v ?? null),
  phone: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
  location: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
  headline: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
  atsScore: z
    .union([z.coerce.number().min(0).max(100).int(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  skills: z.array(z.string()).optional().default([]),
  experience: z
    .array(
      z.object({
        company: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        title: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        startDate: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        endDate: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        location: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        description: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
      }),
    )
    .optional()
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        degree: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        fieldOfStudy: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        startDate: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
        endDate: z.string().trim().min(1).optional().nullable().transform((v) => v ?? null),
      }),
    )
    .optional()
    .default([]),
  yearsOfExperience: z
    .union([z.coerce.number().int().nonnegative(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const sanitizeResponse = (content: string | null | undefined): string => {
  if (!content) {
    throw new Error('Received empty response from OpenAI');
  }

  return content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
};

export const aiParseResume = async (rawText: string): Promise<ParsedResume> => {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const prompt = [
    'You are an expert resume parser. Extract structured data from the resume text provided.',
    'Return ONLY valid JSON matching this exact TypeScript type:',
    `{
  "fullName": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "headline": string | null,
  "atsScore": number | null,
  "skills": string[],
  "experience": { company: string | null, title: string | null, startDate: string | null, endDate: string | null, location: string | null, description: string | null }[],
  "education": { institution: string | null, degree: string | null, fieldOfStudy: string | null, startDate: string | null, endDate: string | null }[],
  "yearsOfExperience": number | null
}`,
    'If data is missing, use null for fields or empty arrays as appropriate.',
    'Return an "atsScore" between 0 and 100 representing how ATS-friendly or complete the resume appears based on standard parsing signals.',
    'Resume text is enclosed between <resume> tags.',
    '<resume>',
    rawText,
    '</resume>',
  ].join('\n');

  const completion = await openai.chat.completions.create({
    model: MODEL_NAME,
    response_format: { type: 'json_object' },
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: 'You extract structured JSON resume data and must respond with valid JSON only.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  const cleaned = sanitizeResponse(content);
  const parsedJson = JSON.parse(cleaned);

  return parsedResumeSchema.parse(parsedJson);
};
