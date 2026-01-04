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
 * IMPORTANT: This workflow does NOT contain business logic.
 * All enrichment logic lives in the worker tasks.
 */

import { logger, task, wait } from "@trigger.dev/sdk/v3";
import type {
  EnrichmentWorkflowPayload,
  EnrichCellPayload,
  CellEnrichmentResult,
  CellTaskStatusType,
  RowStatusType,
} from "@repo/types";
import { aggregateRowStatus, aggregateRowConfidence } from "@repo/types";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client for database operations
const prisma = new PrismaClient();

/**
 * Fake enrichment logic based on column key
 * 
 * Returns deterministic fake data for testing.
 * In production, this would call real providers.
 */
function generateFakeEnrichment(
  columnKey: string,
  rowId: string
): CellEnrichmentResult {
  const key = columnKey.toLowerCase();
  let value: string;
  let confidence = 0.85; // Default fake confidence

  if (key.includes("email")) {
    value = `fake_${rowId.slice(0, 8)}@example.com`;
    confidence = 0.9;
  } else if (key.includes("company") || key.includes("organization")) {
    const companies = ["Fake Corp", "Demo Inc", "Test LLC", "Sample Co", "Example Ltd"];
    value = companies[Math.abs(hashString(rowId)) % companies.length];
    confidence = 0.8;
  } else if (key.includes("title") || key.includes("position")) {
    const titles = ["Fake CEO", "Demo Manager", "Test Engineer", "Sample Analyst"];
    value = titles[Math.abs(hashString(rowId + columnKey)) % titles.length];
    confidence = 0.75;
  } else if (key.includes("bio") || key.includes("description")) {
    value = `This is a fake bio for row ${rowId.slice(0, 8)}. Generated for testing purposes.`;
    confidence = 0.6;
  } else if (key.includes("phone")) {
    value = `+1-555-${String(Math.abs(hashString(rowId)) % 10000).padStart(4, "0")}`;
    confidence = 0.7;
  } else if (key.includes("linkedin")) {
    value = `https://linkedin.com/in/fake-user-${rowId.slice(0, 8)}`;
    confidence = 0.85;
  } else if (key.includes("website") || key.includes("url")) {
    value = `https://fake-${rowId.slice(0, 6)}.example.com`;
    confidence = 0.8;
  } else if (key.includes("location") || key.includes("city") || key.includes("address")) {
    const locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA"];
    value = locations[Math.abs(hashString(rowId)) % locations.length];
    confidence = 0.7;
  } else if (key.includes("industry")) {
    const industries = ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"];
    value = industries[Math.abs(hashString(rowId + columnKey)) % industries.length];
    confidence = 0.75;
  } else if (key.includes("employee") || key.includes("size")) {
    value = String(50 + (Math.abs(hashString(rowId)) % 5000));
    confidence = 0.65;
  } else if (key.includes("revenue")) {
    value = `$${1 + (Math.abs(hashString(rowId)) % 100)}M`;
    confidence = 0.5;
  } else {
    // Default: generic enriched value
    value = `Enriched: ${columnKey} (${rowId.slice(0, 8)})`;
    confidence = 0.5;
  }

  return {
    value,
    confidence,
    source: "fake",
    timestamp: new Date().toISOString(),
    metadata: {
      generator: "fake-enrichment-v1",
    },
  };
}

/**
 * Simple string hash for deterministic fake data
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}

/**
 * Process a single cell enrichment task
 * 
 * This is the core enrichment worker that:
 * 1. Loads task, row, and column data
 * 2. Runs fake enrichment logic
 * 3. Writes result to Row.data and CellEnrichmentTask
 * 4. Updates task status
 * 5. Recalculates row status
 */
export const enrichCellTask = task({
  id: "enrich-cell",
  maxDuration: 60, // 1 minute max per cell
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  queue: {
    name: "cell-enrichment",
    concurrencyLimit: 20, // Process up to 20 cells concurrently
  },
  run: async (payload: EnrichCellPayload, { ctx }) => {
    const { taskId } = payload;
    logger.info("Starting cell enrichment", { taskId });

    try {
      // 1. Load the task with related data
      const cellTask = await prisma.cellEnrichmentTask.findUnique({
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
      await prisma.cellEnrichmentTask.update({
        where: { id: taskId },
        data: {
          status: "running",
          startedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // 3. Simulate processing delay (realistic for real providers)
      await wait.for({ seconds: 0.5 + Math.random() * 1.5 });

      // 4. Run fake enrichment logic
      const enrichmentResult = generateFakeEnrichment(
        cellTask.column.key,
        cellTask.rowId
      );

      logger.info("Enrichment completed", {
        taskId,
        columnKey: cellTask.column.key,
        value: enrichmentResult.value,
        confidence: enrichmentResult.confidence,
      });

      // 5. Update Row.data with enriched value
      const currentData = (cellTask.row.data as Record<string, unknown>) || {};
      const updatedData = {
        ...currentData,
        [cellTask.column.key]: enrichmentResult.value,
      };

      // 6. Transaction: Update task and row
      await prisma.$transaction(async (tx) => {
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
            data: updatedData,
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
      await prisma.$transaction(async (tx) => {
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
      const task = await prisma.cellEnrichmentTask.findUnique({
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
  const cellTasks = await prisma.cellEnrichmentTask.findMany({
    where: { rowId },
    select: { status: true, confidence: true },
  });

  if (cellTasks.length === 0) {
    // No tasks, set to idle
    await prisma.row.update({
      where: { id: rowId },
      data: { status: "idle", confidence: null },
    });
    return;
  }

  const statuses = cellTasks.map((t) => t.status as CellTaskStatusType);
  const confidences = cellTasks.map((t) => t.confidence);

  const newStatus = aggregateRowStatus(statuses) as RowStatusType;
  const newConfidence = aggregateRowConfidence(confidences);

  await prisma.row.update({
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
      await prisma.enrichmentJob.update({
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

      // Mark job as failed
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
