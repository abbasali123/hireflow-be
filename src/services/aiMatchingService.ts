import OpenAI from 'openai';

export interface MatchScoreResult {
  score: number; // 0–100
  explanation: string; // brief reason why it’s a good/bad fit
}

const OPENAI_MODEL = 'gpt-4.1-mini';
const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  throw new Error('OPENAI_API_KEY is not set in the environment variables');
}

const openai = new OpenAI({ apiKey });

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

const clampScore = (score: number): number => {
  if (Number.isNaN(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

export async function scoreCandidateForJob(
  jobDescription: string,
  candidateText: string,
): Promise<MatchScoreResult> {
  const completion = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are an ATS and recruiter. Evaluate candidate fit for the role and respond ONLY with JSON.',
      },
      {
        role: 'user',
        content: `Job Description:\n${jobDescription}\n\nCandidate Resume:\n${candidateText}\n\nReturn ONLY JSON in this exact shape: {"score": number, "explanation": string}. Score must be 0-100.`,
      },
    ],
    temperature: 0.2,
  });

  const rawContent = normalizeContent(completion.choices[0].message?.content);
  const cleanedContent = rawContent.replace(/```json|```/gi, '').trim();

  try {
    const parsed = JSON.parse(cleanedContent);
    return {
      score: clampScore(Number(parsed.score)),
      explanation: String(parsed.explanation || '').trim(),
    };
  } catch (error) {
    throw new Error(`Failed to parse AI match score response: ${cleanedContent}`);
  }
}
