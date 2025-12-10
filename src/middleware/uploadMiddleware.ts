import fs from 'fs';
import multer from 'multer';
import { isS3Driver, storageConfig } from '../config/storageConfig';

if (!isS3Driver && !fs.existsSync(storageConfig.uploadDir)) {
  fs.mkdirSync(storageConfig.uploadDir, { recursive: true });
}

const allowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, storageConfig.uploadDir);
  },
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const storage = isS3Driver ? multer.memoryStorage() : diskStorage;

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported file type. Please upload a PDF or Word document.'));
  }
};

export const upload = multer({ storage, fileFilter });
