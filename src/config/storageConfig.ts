import path from 'path';

export type StorageDriver = 'disk' | 's3';

const driver = (process.env.RESUME_STORAGE_DRIVER || 'disk').toLowerCase() as StorageDriver;

export const storageConfig = {
  driver: driver === 's3' ? 's3' : 'disk',
  uploadDir: path.join(__dirname, '..', '..', 'uploads'),
  s3: {
    bucket: process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET || '',
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  },
} as const;

export const isS3Driver = storageConfig.driver === 's3';
