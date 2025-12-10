import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  jwtSecret: process.env.JWT_SECRET || 'changeme',
  databaseUrl: process.env.DATABASE_URL || '',
  openAiApiKey: process.env.OPENAI_API_KEY || '',
};
