import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import textract from 'textract';

export interface CandidateExtraction {
  rawText: string;
  fullName: string;
  skills: string[];
  experience: string[];
  education: string[];
}

const normalizeText = (text: string): string => {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line, idx, arr) => line.length > 0 || (idx > 0 && arr[idx - 1] !== ''))
    .join('\n')
    .trim();
};

const extractFullName = (rawText: string): string => {
  const lines = rawText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const nameLine = lines.find(
    (line) => !/^(resume|curriculum vitae|cv)$/i.test(line) && line.length > 2,
  );

  return nameLine || 'Unknown Candidate';
};

const extractSections = (rawText: string) => {
  const sections: { [key in 'skills' | 'experience' | 'education']: string[] } = {
    skills: [],
    experience: [],
    education: [],
  };

  const lines = rawText.split('\n');
  let current: 'skills' | 'experience' | 'education' | null = null;

  lines.forEach((line) => {
    const lower = line.toLowerCase();
    if (/\bskills?\b/.test(lower)) {
      current = 'skills';
      return;
    }
    if (/(experience|employment|work history)/.test(lower)) {
      current = 'experience';
      return;
    }
    if (/(education|academics|qualifications)/.test(lower)) {
      current = 'education';
      return;
    }

    if (current) {
      const cleaned = line.trim();
      if (cleaned.length > 0) {
        sections[current].push(cleaned);
      }
    }
  });

  return sections;
};

const extractWithTextract = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(filePath, { preserveLineBreaks: true }, (error, text) => {
      if (error) {
        return reject(error);
      }
      resolve(text || '');
    });
  });
};

const extractTextFromFile = async (
  filePath: string,
  mimeType: string,
  originalName: string,
): Promise<string> => {
  const ext = path.extname(originalName).toLowerCase();

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const fileBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(fileBuffer);
    return pdfData.text || '';
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  if (mimeType === 'application/msword' || ext === '.doc') {
    return extractWithTextract(filePath);
  }

  return extractWithTextract(filePath);
};

export const extractCandidateData = async (
  file: Express.Multer.File,
): Promise<CandidateExtraction> => {
  const raw = await extractTextFromFile(file.path, file.mimetype, file.originalname);
  const rawText = normalizeText(raw);
  const fullName = extractFullName(rawText);
  const sections = extractSections(rawText);

  return {
    rawText,
    fullName,
    skills: sections.skills,
    experience: sections.experience,
    education: sections.education,
  };
};
