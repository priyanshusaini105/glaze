-- CreateEnum
CREATE TYPE "RowStatus" AS ENUM ('idle', 'queued', 'running', 'done', 'failed', 'ambiguous');

-- AlterTable
ALTER TABLE "rows" ADD COLUMN "status" "RowStatus" NOT NULL DEFAULT 'idle',
ADD COLUMN "confidence" DOUBLE PRECISION,
ADD COLUMN "error" TEXT,
ADD COLUMN "lastRunAt" TIMESTAMP(3);
