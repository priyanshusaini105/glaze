/**
 * Cell Enrichment Workflow (Optimized)
 * 
 * Trigger.dev workflow for orchestrating cell-level enrichment.
 * OPTIMIZED: Reduced database round-trips from 7 to 3 per cell.
 */

import { logger, task } from "@trigger.dev/sdk";
import type {
  EnrichmentWorkflowPayload,
  EnrichCellPayload,
  CellEnrichmentResult,
  CellTaskStatusType,
  RowStatusType,
} from "@repo/types";
import { aggregateRowStatus, aggregateRowConfidence } from "@repo/types";
import { getPrisma } from "./db";
import { enrichCellWithProviders } from "./enrichment-service";

/**
 * Process a single cell enrichment task
 * 
 * OPTIMIZED: Reduced from 7 to 3 database operations
 */
export const enrichCellTask = task({
  id: "enrich-cell",
  maxDuration: 120,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  queue: {
    name: "cell-enrichment",
    concurrencyLimit: 10,
  },
  run: async (payload: EnrichCellPayload, { ctx }) => {
    const { taskId } = payload;
    logger.info("Starting cell enrichment", { taskId });

    const prisma = getPrisma();

    try {
      // 1. Load task AND mark as running in ONE operation (updateMany with return)
      // First get the task data we need
      const cellTask = await prisma.cellEnrichmentTask.update({
        where: { id: taskId },
        data: {
          status: "running",
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
        include: {
          row: true,
          column: true,
        },
      });

      if (!cellTask) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // 2. Run enrichment (NO database operations here - just mock/API calls)
      const enrichmentResult = await enrichCellWithProviders({
        columnKey: cellTask.column.key,
        rowId: cellTask.rowId,
        tableId: cellTask.tableId,
        existingData: (cellTask.row.data as Record<string, unknown>) || {},
      });

      const cellResult: CellEnrichmentResult = {
        value: enrichmentResult.value as string,
        confidence: enrichmentResult.confidence,
        source: enrichmentResult.source,
        timestamp: enrichmentResult.timestamp,
        metadata: enrichmentResult.metadata,
      };

      logger.info("Enrichment completed", {
        taskId,
        columnKey: cellTask.column.key,
        value: cellResult.value,
        confidence: cellResult.confidence,
        source: cellResult.source,
      });

      // 3. SINGLE transaction to update everything
      const currentData = (cellTask.row.data as Record<string, unknown>) || {};
      const updatedData = {
        ...currentData,
        [cellTask.column.key]: enrichmentResult.value,
      };

      // Get all cell tasks for this row to calculate status (in same transaction)
      await prisma.$transaction(async (tx: any) => {
        // Update task with result
        await tx.cellEnrichmentTask.update({
          where: { id: taskId },
          data: {
            status: "done",
            result: enrichmentResult as unknown as object,
            confidence: enrichmentResult.confidence,
            completedAt: new Date(),
          },
        });

        // Update row data AND get all tasks for status calculation
        const [, allTasks] = await Promise.all([
          tx.row.update({
            where: { id: cellTask.rowId },
            data: {
              data: updatedData as any,
              lastRunAt: new Date(),
            },
          }),
          tx.cellEnrichmentTask.findMany({
            where: { rowId: cellTask.rowId },
            select: { status: true, confidence: true },
          }),
        ]);

        // Calculate row status from tasks (done synchronously, no DB call)
        const statuses = allTasks.map((t: any) => t.status as CellTaskStatusType);
        const confidences = allTasks.map((t: any) => t.confidence);

        // The current task we're completing counts as "done"
        const statusForAggregation = statuses.map((s: string) =>
          s === "running" ? "done" : s
        );

        const newStatus = aggregateRowStatus(statusForAggregation) as RowStatusType;
        const newConfidence = aggregateRowConfidence(confidences);

        // Update row status and job done count in parallel
        await Promise.all([
          tx.row.update({
            where: { id: cellTask.rowId },
            data: { status: newStatus, confidence: newConfidence },
          }),
          tx.enrichmentJob.update({
            where: { id: cellTask.jobId },
            data: { doneTasks: { increment: 1 } },
          }),
        ]);
      });

      return {
        taskId,
        status: "done" as CellTaskStatusType,
        result: enrichmentResult,
        error: null,
      };
    } catch (error) {
      logger.error("Cell enrichment failed", {
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });

      // Update task as failed (single operation)
      await prisma.cellEnrichmentTask.update({
        where: { id: taskId },
        data: {
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
          completedAt: new Date(),
        },
      });

      // Get task info and update job failed count
      const task = await prisma.cellEnrichmentTask.findUnique({
        where: { id: taskId },
        select: { jobId: true, rowId: true },
      });

      if (task) {
        await prisma.$transaction(async (tx: any) => {
          await tx.enrichmentJob.update({
            where: { id: task.jobId },
            data: { failedTasks: { increment: 1 } },
          });

          // Recalculate row status
          const allTasks = await tx.cellEnrichmentTask.findMany({
            where: { rowId: task.rowId },
            select: { status: true, confidence: true },
          });

          const statuses = allTasks.map((t: any) => t.status as CellTaskStatusType);
          const confidences = allTasks.map((t: any) => t.confidence);
          const newStatus = aggregateRowStatus(statuses) as RowStatusType;
          const newConfidence = aggregateRowConfidence(confidences);

          await tx.row.update({
            where: { id: task.rowId },
            data: { status: newStatus, confidence: newConfidence },
          });
        });
      }

      throw error;
    }
  },
});

/**
 * Process an entire enrichment job
 */
export const processEnrichmentJobTask = task({
  id: "process-enrichment-job",
  maxDuration: 3600,
  queue: {
    name: "enrichment-jobs",
    concurrencyLimit: 5,
  },
  run: async (payload: EnrichmentWorkflowPayload, { ctx }) => {
    const { jobId, tableId, taskIds } = payload;
    logger.info("Starting enrichment job", {
      jobId,
      tableId,
      taskCount: taskIds.length,
    });

    const prisma = getPrisma();

    try {
      // Mark job as running
      await prisma.enrichmentJob.update({
        where: { id: jobId },
        data: {
          status: "running",
          startedAt: new Date(),
        },
      });

      logger.info("Processing tasks", {
        totalTasks: taskIds.length,
      });

      // Trigger all tasks (they will run concurrently based on queue settings)
      const allRuns = await Promise.all(
        taskIds.map((taskId) =>
          enrichCellTask.triggerAndWait({ taskId })
        )
      );

      // Check results
      const successCount = allRuns.filter((r) => r.ok).length;
      const failCount = allRuns.filter((r) => !r.ok).length;

      logger.info("Job tasks completed", {
        jobId,
        successCount,
        failCount,
      });

      // Update job status
      const finalStatus = failCount === taskIds.length
        ? "failed"
        : failCount > 0
          ? "completed"
          : "completed";

      await prisma.enrichmentJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          error: failCount > 0 ? `${failCount} tasks failed` : null,
        },
      });

      return {
        jobId,
        status: finalStatus,
        totalTasks: taskIds.length,
        successCount,
        failCount,
      };
    } catch (error) {
      logger.error("Enrichment job failed", {
        jobId,
        error: error instanceof Error ? error.message : String(error),
      });

      await prisma.enrichmentJob.update({
        where: { id: jobId },
        data: {
          status: "failed",
          completedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  },
});
