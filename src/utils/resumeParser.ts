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

const extractWithTextractFromPath = async (filePath: string, mimeType: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    textract.fromFileWithPath(
      filePath,
      { preserveLineBreaks: true, typeOverride: mimeType },
      (error, text) => {
        if (error) {
          return reject(error);
        }
        resolve(text || '');
      },
    );
  });
};

const extractWithTextractFromBuffer = async (
  mimeType: string,
  buffer: Buffer,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    textract.fromBufferWithMime(mimeType, buffer, { preserveLineBreaks: true }, (error, text) => {
      if (error) {
        return reject(error);
      }
      resolve(text || '');
    });
  });
};

const extractTextFromFile = async (
  file: Express.Multer.File,
): Promise<string> => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    const buffer = file.buffer || (file.path ? await fs.readFile(file.path) : null);
    if (!buffer) {
      throw new Error('Unable to read PDF content for parsing');
    }
    const pdfData = await pdfParse(buffer);
    return pdfData.text || '';
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    if (file.buffer) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return result.value || '';
    }
    if (file.path) {
      const result = await mammoth.extractRawText({ path: file.path });
      return result.value || '';
    }
    throw new Error('Unable to read DOCX content for parsing');
  }

  if (mimeType === 'application/msword' || ext === '.doc') {
    if (file.buffer) {
      return extractWithTextractFromBuffer(mimeType, file.buffer);
    }
    if (file.path) {
      return extractWithTextractFromPath(file.path, mimeType);
    }
    throw new Error('Unable to read DOC content for parsing');
  }

  if (file.buffer) {
    return extractWithTextractFromBuffer(mimeType, file.buffer);
  }
  if (file.path) {
    return extractWithTextractFromPath(file.path, mimeType);
  }

  throw new Error('Unsupported file input for resume parsing');
};

export const extractCandidateData = async (
  file: Express.Multer.File,
): Promise<CandidateExtraction> => {
  const raw = await extractTextFromFile(file);
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
