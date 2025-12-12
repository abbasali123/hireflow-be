import OpenAI from 'openai';
import { Candidate, Job } from '@prisma/client';
import { config } from '../config/env';

const apiKey = config.openAiApiKey;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not set in the environment variables');
}

const openai = new OpenAI({ apiKey });
const DEFAULT_MODEL = 'gpt-4o-mini';

type MessageContent = string | OpenAI.Chat.Completions.ChatCompletionContentPart[] | null;

const normalizeContent = (content: MessageContent): string => {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if ('text' in part && part.text) {
          return part.text;
        }

        return '';
      })
      .join('');
  }

  return '';
};

const formatSkills = (skills: unknown): string => {
  if (Array.isArray(skills)) {
    return skills.join(', ');
  }

  if (typeof skills === 'string') {
    return skills;
  }

  if (skills) {
    return JSON.stringify(skills);
  }

  return 'Not specified';
};

const buildJobPrompt = (job: Job): string => {
  const requiredSkills = formatSkills(job.requiredSkills);
  const niceToHaveSkills = formatSkills(job.niceToHaveSkills);

  return [
    `Job Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Seniority: ${job.seniority}`,
    `Salary Range: ${job.salaryMin ?? 'N/A'} - ${job.salaryMax ?? 'N/A'}`,
    `Description: ${job.description}`,
    `Required Skills: ${requiredSkills}`,
    `Nice To Have Skills: ${niceToHaveSkills}`,
  ].join('\n');
};

const buildCandidatePrompt = (candidate: Candidate): string => {
  const skills = formatSkills(candidate.skills);
  const experience = formatSkills(candidate.experience);
  const education = formatSkills(candidate.education);

  return [
    `Name: ${candidate.fullName}`,
    `Location: ${candidate.location ?? 'Not specified'}`,
    `Headline: ${candidate.headline ?? 'Not provided'}`,
    `Skills: ${skills}`,
    `Experience: ${experience}`,
    `Education: ${education}`,
    `Email: ${candidate.email ?? 'Not provided'}`,
    `Phone: ${candidate.phone ?? 'Not provided'}`,
    `Years of Experience: ${candidate.yearsOfExperience ?? 'Not provided'}`,
  ].join('\n');
};

export const generateJobDescription = async (prompt: string): Promise<string> => {
  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'You are an expert recruiter. Write clear, inclusive job descriptions.',
      },
      {
        role: 'user',
        content: `Create a detailed job description based on this prompt:\n${prompt}`,
      },
    ],
    temperature: 0.7,
  });

  const content = completion.choices[0].message?.content;
  const jobDescription = normalizeContent(content);

  return jobDescription.trim();
};

export const scoreCandidate = async (
  jobDescription: string,
  candidateText: string,
): Promise<{ score: number; explanation: string }> => {
  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are an impartial technical recruiter. Score candidates from 0-100 and explain your reasoning in JSON.',
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nCandidate Resume or Profile:\n${candidateText}\n\nReturn a JSON object: {"score": number, "explanation": string}.`,
      },
    ],
    temperature: 0.3,
  });

  const rawContent = normalizeContent(completion.choices[0].message?.content);
  const cleanedContent = rawContent.replace(/```json|```/g, '').trim();

  try {
    const parsed = JSON.parse(cleanedContent);
    return { score: Number(parsed.score) || 0, explanation: String(parsed.explanation || '') };
  } catch (error) {
    console.error('Failed to parse scoreCandidate response:', error, cleanedContent);
    return { score: 0, explanation: rawContent.trim() };
  }
};

export const generateOutreach = async (job: Job, candidate: Candidate): Promise<string> => {
  const jobDetails = buildJobPrompt(job);
  const candidateDetails = buildCandidatePrompt(candidate);

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a helpful recruiter crafting concise outreach messages. Be professional, friendly, and personalize the note based on the candidate profile.',
      },
      {
        role: 'user',
        content: `Job Details:\n${jobDetails}\n\nCandidate Details:\n${candidateDetails}\n\nWrite a short outreach message inviting the candidate to discuss the role.`,
      },
    ],
    temperature: 0.6,
  });

  const content = completion.choices[0].message?.content;
  return normalizeContent(content).trim();
};

export const generateSummary = async (job: Job, candidate: Candidate): Promise<string> => {
  const jobDetails = buildJobPrompt(job);
  const candidateDetails = buildCandidatePrompt(candidate);

  const completion = await openai.chat.completions.create({
    model: DEFAULT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You summarize candidate fit concisely for recruiters. Provide a short paragraph highlighting alignment between the candidate and the role.',
      },
      {
        role: 'user',
        content: `Job Details:\n${jobDetails}\n\nCandidate Details:\n${candidateDetails}\n\nProvide a concise summary of the candidate fit for this job.`,
      },
    ],
    temperature: 0.5,
  });

  const content = completion.choices[0].message?.content;
  return normalizeContent(content).trim();
};
