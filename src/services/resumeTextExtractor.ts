import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ExtractedTextResult {
  text: string;
  isScannedLike: boolean;
}

const readFileBuffer = async (file: Express.Multer.File): Promise<Buffer> => {
  if (file.buffer) {
    return file.buffer;
  }

  if (file.path) {
    return fs.readFile(file.path);
  }

  throw new Error('Uploaded file is not accessible');
};

export const extractTextFromResume = async (
  file: Express.Multer.File,
): Promise<ExtractedTextResult> => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype;
  let text = '';

  try {
    if (mime === 'application/pdf' || ext === '.pdf') {
      const buffer = await readFileBuffer(file);
      const parsed = await pdfParse(buffer);
      text = parsed.text || '';
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    ) {
      if (file.buffer) {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        text = result.value || '';
      } else if (file.path) {
        const result = await mammoth.extractRawText({ path: file.path });
        text = result.value || '';
      }
    } else if (mime === 'text/plain' || ext === '.txt') {
      const buffer = await readFileBuffer(file);
      text = buffer.toString('utf-8');
    } else {
      throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not extract text from resume';
    throw new Error(message);
  }

  const cleaned = text.trim();

  if (!cleaned) {
    throw new Error('Could not extract text from resume');
  }

  const length = cleaned.length;
  const lineCount = cleaned.split(/\r?\n/).length;
  const isScannedLike = length < 200 || lineCount < 5;

  return { text: cleaned, isScannedLike };
};
