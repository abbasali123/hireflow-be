-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('OPEN', 'CLOSED');

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "status" "JobStatus" NOT NULL DEFAULT 'OPEN';
