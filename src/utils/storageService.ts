import crypto from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { isS3Driver, storageConfig } from '../config/storageConfig';

let s3Client: S3Client | null = null;

const getS3Client = () => {
  if (!s3Client) {
    s3Client = new S3Client({ region: storageConfig.s3.region });
  }
  return s3Client;
};

export const uploadResumeToS3 = async (
  file: Express.Multer.File,
): Promise<{ location: string; key: string } | null> => {
  if (!isS3Driver) {
    return null;
  }

  if (!storageConfig.s3.bucket) {
    throw new Error('S3 bucket is not configured. Set S3_BUCKET_NAME to enable S3 uploads.');
  }

  if (!file.buffer) {
    throw new Error('File buffer is required for S3 upload.');
  }

  const key = `resumes/${Date.now()}-${crypto.randomUUID()}-${file.originalname}`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: storageConfig.s3.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    }),
  );

  return {
    location: `s3://${storageConfig.s3.bucket}/${key}`,
    key,
  };
};
