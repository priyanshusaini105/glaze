-- CreateEnum
CREATE TYPE "CellTaskStatus" AS ENUM ('queued', 'running', 'done', 'failed');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "enrichment_jobs" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "doneTasks" INTEGER NOT NULL DEFAULT 0,
    "failedTasks" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enrichment_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cell_enrichment_tasks" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "columnId" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" "CellTaskStatus" NOT NULL DEFAULT 'queued',
    "result" JSONB,
    "confidence" DOUBLE PRECISION,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cell_enrichment_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "enrichment_jobs_tableId_idx" ON "enrichment_jobs"("tableId");

-- CreateIndex
CREATE INDEX "enrichment_jobs_status_idx" ON "enrichment_jobs"("status");

-- CreateIndex
CREATE INDEX "cell_enrichment_tasks_jobId_idx" ON "cell_enrichment_tasks"("jobId");

-- CreateIndex
CREATE INDEX "cell_enrichment_tasks_status_idx" ON "cell_enrichment_tasks"("status");

-- CreateIndex
CREATE INDEX "cell_enrichment_tasks_rowId_idx" ON "cell_enrichment_tasks"("rowId");

-- CreateIndex
CREATE INDEX "cell_enrichment_tasks_columnId_idx" ON "cell_enrichment_tasks"("columnId");

-- CreateIndex
CREATE UNIQUE INDEX "cell_enrichment_tasks_jobId_rowId_columnId_key" ON "cell_enrichment_tasks"("jobId", "rowId", "columnId");

-- AddForeignKey
ALTER TABLE "enrichment_jobs" ADD CONSTRAINT "enrichment_jobs_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cell_enrichment_tasks" ADD CONSTRAINT "cell_enrichment_tasks_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "tables"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cell_enrichment_tasks" ADD CONSTRAINT "cell_enrichment_tasks_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cell_enrichment_tasks" ADD CONSTRAINT "cell_enrichment_tasks_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "columns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cell_enrichment_tasks" ADD CONSTRAINT "cell_enrichment_tasks_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "enrichment_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
