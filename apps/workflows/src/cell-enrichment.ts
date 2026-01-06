/**
 * Cell Enrichment Workflow
 * 
 * Trigger.dev workflow for orchestrating cell-level enrichment.
 * This workflow:
 * 1. Accepts a jobId and list of taskIds
 * 2. Updates job status to running
 * 3. Triggers enrichCell for each task (with concurrency control)
 * 4. Handles retries for failed tasks
 * 5. Updates job status when complete
 * 
 * Enrichment is handled by the enrichment service which uses:
 * - Waterfall strategy: cache → free → cheap → premium
 * - Mock providers (configurable to use real providers)
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
 * This is the core enrichment worker that:
 * 1. Loads task, row, and column data
 * 2. Runs enrichment using the provider waterfall strategy
 * 3. Writes result to Row.data and CellEnrichmentTask
 * 4. Updates task status
 * 5. Recalculates row status
 */
export const enrichCellTask = task({
  id: "enrich-cell",
  maxDuration: 120, // 2 minutes max per cell (providers may have delays)
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  queue: {
    name: "cell-enrichment",
    concurrencyLimit: 10, // Process up to 10 cells concurrently
  },
  run: async (payload: EnrichCellPayload, { ctx }) => {
    const { taskId } = payload;
    logger.info("Starting cell enrichment", { taskId });

    try {
      // 1. Load the task with related data
      const cellTask = await getPrisma().cellEnrichmentTask.findUnique({
        where: { id: taskId },
        include: {
          row: true,
          column: true,
        },
      });

      if (!cellTask) {
        throw new Error(`Task not found: ${taskId}`);
      }

      // 2. Mark task as running
      await getPrisma().cellEnrichmentTask.update({
        where: { id: taskId },
        data: {
          status: "running",
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // 3. Run enrichment using the provider waterfall strategy
      const enrichmentResult = await enrichCellWithProviders({
        columnKey: cellTask.column.key,
        rowId: cellTask.rowId,
        tableId: cellTask.tableId,
        existingData: (cellTask.row.data as Record<string, unknown>) || {},
      });

      // Convert to CellEnrichmentResult type
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
        cost: enrichmentResult.metadata?.cost,
      });

      // 5. Update Row.data with enriched value
      const currentData = (cellTask.row.data as Record<string, unknown>) || {};
      const updatedData = {
        ...currentData,
        [cellTask.column.key]: enrichmentResult.value,
      };

      // 6. Transaction: Update task and row
      await getPrisma().$transaction(async (tx: any) => {
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

        // Update row data
        await tx.row.update({
          where: { id: cellTask.rowId },
          data: {
            data: updatedData as any, // Cast to avoid Prisma JSON type issues
            lastRunAt: new Date(),
          },
        });

        // Update job done count
        await tx.enrichmentJob.update({
          where: { id: cellTask.jobId },
          data: {
            doneTasks: { increment: 1 },
          },
        });
      });

      // 7. Recalculate row status (after transaction)
      await recalculateRowStatus(cellTask.rowId);

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

      // Update task as failed
      await getPrisma().$transaction(async (tx: any) => {
        await tx.cellEnrichmentTask.update({
          where: { id: taskId },
          data: {
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
            completedAt: new Date(),
          },
        });

        // Get job ID to update failed count
        const task = await tx.cellEnrichmentTask.findUnique({
          where: { id: taskId },
          select: { jobId: true, rowId: true },
        });

        if (task) {
          await tx.enrichmentJob.update({
            where: { id: task.jobId },
            data: {
              failedTasks: { increment: 1 },
            },
          });
        }
      });

      // Still recalculate row status
      const task = await getPrisma().cellEnrichmentTask.findUnique({
        where: { id: taskId },
        select: { rowId: true },
      });
      if (task) {
        await recalculateRowStatus(task.rowId);
      }

      throw error; // Re-throw to trigger retry
    }
  },
});

/**
 * Recalculate row status based on all its cell tasks
 */
async function recalculateRowStatus(rowId: string): Promise<void> {
  const cellTasks = await getPrisma().cellEnrichmentTask.findMany({
    where: { rowId },
    select: { status: true, confidence: true },
  });

  if (cellTasks.length === 0) {
    // No tasks, set to idle
    await getPrisma().row.update({
      where: { id: rowId },
      data: { status: "idle", confidence: null },
    });
    return;
  }

  const statuses = cellTasks.map((t) => t.status as CellTaskStatusType);
  const confidences = cellTasks.map((t) => t.confidence);

  const newStatus = aggregateRowStatus(statuses) as RowStatusType;
  const newConfidence = aggregateRowConfidence(confidences);

  await getPrisma().row.update({
    where: { id: rowId },
    data: {
      status: newStatus,
      confidence: newConfidence,
    },
  });
}

/**
 * Process an entire enrichment job
 * 
 * This is the main workflow that:
 * 1. Loads job and marks it as running
 * 2. Triggers enrichCellTask for each cell
 * 3. Waits for all tasks to complete
 * 4. Updates job status
 */
export const processEnrichmentJobTask = task({
  id: "process-enrichment-job",
  maxDuration: 3600, // 1 hour max per job
  queue: {
    name: "enrichment-jobs",
    concurrencyLimit: 5, // Max 5 jobs at once
  },
  run: async (payload: EnrichmentWorkflowPayload, { ctx }) => {
    const { jobId, tableId, taskIds } = payload;
    logger.info("Starting enrichment job", {
      jobId,
      tableId,
      taskCount: taskIds.length,
    });

    try {
      // 1. Mark job as running
      await getPrisma().enrichmentJob.update({
        where: { id: jobId },
        data: {
          status: "running",
          startedAt: new Date(),
        },
      });

      // 2. Trigger all cell tasks in batches
      // Using batchTrigger for efficiency
      const batchSize = 50;
      const batches: string[][] = [];

      for (let i = 0; i < taskIds.length; i += batchSize) {
        batches.push(taskIds.slice(i, i + batchSize));
      }

      logger.info("Processing tasks in batches", {
        totalTasks: taskIds.length,
        batchCount: batches.length,
        batchSize,
      });

      // Trigger all tasks (they will run concurrently based on queue settings)
      const allRuns = await Promise.all(
        taskIds.map((taskId) =>
          enrichCellTask.triggerAndWait({ taskId })
        )
      );

      // 3. Check results
      const successCount = allRuns.filter((r) => r.ok).length;
      const failCount = allRuns.filter((r) => !r.ok).length;

      logger.info("Job tasks completed", {
        jobId,
        successCount,
        failCount,
      });

      // 4. Update job status
      const finalStatus = failCount === taskIds.length
        ? "failed"
        : failCount > 0
          ? "completed" // Some failures but not all
          : "completed";

      await getPrisma().enrichmentJob.update({
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

      // Mark job as failed
      await getPrisma().enrichmentJob.update({
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
