import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';




























































































































































































































































































































































































































});  },    }      throw error;      });        },          error: error instanceof Error ? error.message : String(error),          completedAt: new Date(),          status: "failed",        data: {        where: { id: jobId },      await prisma.enrichmentJob.update({      // Mark job as failed      });        error: error instanceof Error ? error.message : String(error),        jobId,      logger.error("Enrichment job failed", {    } catch (error) {      };        failCount,        successCount,        totalTasks: taskIds.length,        status: finalStatus,        jobId,      return {      });        },          error: failCount > 0 ? `${failCount} tasks failed` : null,          completedAt: new Date(),          status: finalStatus,        data: {        where: { id: jobId },      await prisma.enrichmentJob.update({        : "completed";        ? "completed" // Some failures but not all        : failCount > 0        ? "failed"      const finalStatus = failCount === taskIds.length      // 4. Update job status      });        failCount,        successCount,        jobId,      logger.info("Job tasks completed", {      const failCount = allRuns.filter((r) => !r.ok).length;      const successCount = allRuns.filter((r) => r.ok).length;      // 3. Check results      );        )          enrichCellTask.triggerAndWait({ taskId })        taskIds.map((taskId) =>      const allRuns = await Promise.all(      // Trigger all tasks (they will run concurrently based on queue settings)      });        batchSize,        batchCount: batches.length,        totalTasks: taskIds.length,      logger.info("Processing tasks in batches", {      }        batches.push(taskIds.slice(i, i + batchSize));      for (let i = 0; i < taskIds.length; i += batchSize) {      const batches: string[][] = [];      const batchSize = 50;      // Using batchTrigger for efficiency      // 2. Trigger all cell tasks in batches      });        },          startedAt: new Date(),          status: "running",        data: {        where: { id: jobId },      await prisma.enrichmentJob.update({      // 1. Mark job as running    try {    });      taskCount: taskIds.length,      tableId,      jobId,    logger.info("Starting enrichment job", {    const { jobId, tableId, taskIds } = payload;  run: async (payload: EnrichmentWorkflowPayload, { ctx }) => {  },    concurrencyLimit: 5, // Max 5 jobs at once    name: "enrichment-jobs",  queue: {  maxDuration: 3600, // 1 hour max per job  id: "process-enrichment-job",export const processEnrichmentJobTask = task({ */ * 4. Updates job status * 3. Waits for all tasks to complete * 2. Triggers enrichCellTask for each cell * 1. Loads job and marks it as running * This is the main workflow that: *  * Process an entire enrichment job/**}  });    },      confidence: newConfidence,      status: newStatus,    data: {    where: { id: rowId },  await prisma.row.update({  const newConfidence = aggregateRowConfidence(confidences);  const newStatus = aggregateRowStatus(statuses) as RowStatusType;  const confidences = cellTasks.map((t) => t.confidence);  const statuses = cellTasks.map((t) => t.status as CellTaskStatusType);  }    return;    });      data: { status: "idle", confidence: null },      where: { id: rowId },    await prisma.row.update({    // No tasks, set to idle  if (cellTasks.length === 0) {  });    select: { status: true, confidence: true },    where: { rowId },  const cellTasks = await prisma.cellEnrichmentTask.findMany({async function recalculateRowStatus(rowId: string): Promise<void> { */ * Recalculate row status based on all its cell tasks/**});  },    }      throw error; // Re-throw to trigger retry      }        await recalculateRowStatus(task.rowId);      if (task) {      });        select: { rowId: true },        where: { id: taskId },      const task = await prisma.cellEnrichmentTask.findUnique({      // Still recalculate row status      });        }          });            },              failedTasks: { increment: 1 },            data: {            where: { id: task.jobId },          await tx.enrichmentJob.update({        if (task) {        });          select: { jobId: true, rowId: true },          where: { id: taskId },        const task = await tx.cellEnrichmentTask.findUnique({        // Get job ID to update failed count        });          },            completedAt: new Date(),            error: error instanceof Error ? error.message : String(error),            status: "failed",          data: {          where: { id: taskId },        await tx.cellEnrichmentTask.update({      await prisma.$transaction(async (tx) => {      // Update task as failed      });        error: error instanceof Error ? error.message : String(error),        taskId,      logger.error("Cell enrichment failed", {    } catch (error) {      };        error: null,        result: enrichmentResult,        status: "done" as CellTaskStatusType,        taskId,      return {      await recalculateRowStatus(cellTask.rowId);      // 7. Recalculate row status (after transaction)      });        });          },            doneTasks: { increment: 1 },          data: {          where: { id: cellTask.jobId },        await tx.enrichmentJob.update({        // Update job done count        });          },            lastRunAt: new Date(),            data: updatedData,          data: {          where: { id: cellTask.rowId },        await tx.row.update({        // Update row data        });          },            completedAt: new Date(),            confidence: enrichmentResult.confidence,            result: enrichmentResult as unknown as object,            status: "done",          data: {          where: { id: taskId },        await tx.cellEnrichmentTask.update({        // Update task with result      await prisma.$transaction(async (tx) => {      // 6. Transaction: Update task and row      };        [cellTask.column.key]: enrichmentResult.value,        ...currentData,      const updatedData = {      const currentData = (cellTask.row.data as Record<string, unknown>) || {};      // 5. Update Row.data with enriched value      });        confidence: enrichmentResult.confidence,        value: enrichmentResult.value,        columnKey: cellTask.column.key,        taskId,      logger.info("Enrichment completed", {      );        cellTask.rowId        cellTask.column.key,      const enrichmentResult = generateFakeEnrichment(      // 4. Run fake enrichment logic      await wait.for({ seconds: 0.5 + Math.random() * 1.5 });      // 3. Simulate processing delay (realistic for real providers)      });        },          attempts: { increment: 1 },          startedAt: new Date(),          status: "running",        data: {        where: { id: taskId },      await prisma.cellEnrichmentTask.update({      // 2. Mark task as running      }        throw new Error(`Task not found: ${taskId}`);      if (!cellTask) {      });        },          column: true,          row: true,        include: {        where: { id: taskId },      const cellTask = await prisma.cellEnrichmentTask.findUnique({      // 1. Load the task with related data    try {    logger.info("Starting cell enrichment", { taskId });    const { taskId } = payload;  run: async (payload: EnrichCellPayload, { ctx }) => {  },    concurrencyLimit: 20, // Process up to 20 cells concurrently    name: "cell-enrichment",  queue: {  },    factor: 2,    maxTimeoutInMs: 10000,    minTimeoutInMs: 1000,    maxAttempts: 3,  retry: {  maxDuration: 60, // 1 minute max per cell  id: "enrich-cell",export const enrichCellTask = task({ */ * 5. Recalculates row status * 4. Updates task status * 3. Writes result to Row.data and CellEnrichmentTask * 2. Runs fake enrichment logic * 1. Loads task, row, and column data * This is the core enrichment worker that: *  * Process a single cell enrichment task/**}  return hash;  }    hash = hash & hash;    hash = (hash << 5) - hash + char;    const char = str.charCodeAt(i);  for (let i = 0; i < str.length; i++) {  let hash = 0;function hashString(str: string): number { */ * Simple string hash for deterministic fake data/**}  };    },      generator: "fake-enrichment-v1",    metadata: {    timestamp: new Date().toISOString(),    source: "fake",    confidence,    value,  return {  }    confidence = 0.5;    value = `Enriched: ${columnKey} (${rowId.slice(0, 8)})`;    // Default: generic enriched value  } else {    confidence = 0.5;    value = `$${1 + (Math.abs(hashString(rowId)) % 100)}M`;  } else if (key.includes("revenue")) {    confidence = 0.65;    value = String(50 + (Math.abs(hashString(rowId)) % 5000));  } else if (key.includes("employee") || key.includes("size")) {    confidence = 0.75;    value = industries[Math.abs(hashString(rowId + columnKey)) % industries.length];    const industries = ["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"];  } else if (key.includes("industry")) {    confidence = 0.7;    value = locations[Math.abs(hashString(rowId)) % locations.length];    const locations = ["San Francisco, CA", "New York, NY", "Austin, TX", "Seattle, WA"];  } else if (key.includes("location") || key.includes("city") || key.includes("address")) {    confidence = 0.8;    value = `https://fake-${rowId.slice(0, 6)}.example.com`;  } else if (key.includes("website") || key.includes("url")) {    confidence = 0.85;    value = `https://linkedin.com/in/fake-user-${rowId.slice(0, 8)}`;  } else if (key.includes("linkedin")) {    confidence = 0.7;    value = `+1-555-${String(Math.abs(hashString(rowId)) % 10000).padStart(4, "0")}`;  } else if (key.includes("phone")) {    confidence = 0.6;    value = `This is a fake bio for row ${rowId.slice(0, 8)}. Generated for testing purposes.`;  } else if (key.includes("bio") || key.includes("description")) {    confidence = 0.75;    value = titles[Math.abs(hashString(rowId + columnKey)) % titles.length];    const titles = ["Fake CEO", "Demo Manager", "Test Engineer", "Sample Analyst"];  } else if (key.includes("title") || key.includes("position")) {    confidence = 0.8;    value = companies[Math.abs(hashString(rowId)) % companies.length];    const companies = ["Fake Corp", "Demo Inc", "Test LLC", "Sample Co", "Example Ltd"];  } else if (key.includes("company") || key.includes("organization")) {    confidence = 0.9;    value = `fake_${rowId.slice(0, 8)}@example.com`;  if (key.includes("email")) {  let confidence = 0.85; // Default fake confidence  let value: string;  const key = columnKey.toLowerCase();): CellEnrichmentResult {  rowId: string  columnKey: string,function generateFakeEnrichment( */ * In production, this would call real providers. * Returns deterministic fake data for testing. *  * Fake enrichment logic based on column key/**const prisma = new PrismaClient();// Initialize Prisma client for database operationsimport { PrismaClient } from "@prisma/client";import { aggregateRowStatus, aggregateRowConfidence } from "@glaze/types";} from "@glaze/types";  RowStatusType,  CellTaskStatusType,  CellEnrichmentResult,  EnrichCellPayload,  EnrichmentWorkflowPayload,import type {import { logger, task, wait } from "@trigger.dev/sdk/v3"; */ * All enrichment logic lives in the worker tasks. * IMPORTANT: This workflow does NOT contain business logic. *  * 5. Updates job status when complete * 4. Handles retries for failed tasks * 3. Triggers enrichCell for each task (with concurrency control) * 2. Updates job status to running * 1. Accepts a jobId and list of taskIds * This workflow: * Trigger.dev workflow for orchestrating cell-level enrichment. * import { swagger } from '@elysiajs/swagger';
import { tablesRoutes } from './routes/tables';
import { registerEnrichmentRoutes } from './routes/enrich';
import { registerLinkedInRoutes } from './routes/linkedin';
import { registerCellEnrichmentRoutes } from './routes/cell-enrich';
import { startEnrichmentWorker } from './services/enrichment-queue';

export const buildApp = () => {
  const app = new Elysia()
    .use(cors())
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Glaze API',
            version: '0.4.0',
            description: 'High-performance data enrichment platform with cell-level enrichment'
          },
          servers: [
            {
              url: process.env.API_URL || `http://localhost:${process.env.PORT ?? 3001}`
            }
          ]
        },
        provider: 'swagger-ui',
        path: '/docs',
        specPath: '/docs/json'
      })
    )
    .get('/health', () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'glaze-api',
      uptime: process.uptime()
    }))
    .get('/', () => ({
      message: 'Welcome to Glaze API',
      version: '0.4.0',
      endpoints: {
        health: '/health',
        tables: '/tables',
        enrich: '/enrich',
        cellEnrich: '/tables/:tableId/enrich',
        linkedin: '/linkedin',
        docs: '/docs'
      }
    }))
    .use(tablesRoutes)
    .use(registerEnrichmentRoutes)
    .use(registerLinkedInRoutes)
    .use(registerCellEnrichmentRoutes);

  return app;
};

  return app;
};

// Export type for Elysia Eden (type-safe client)
export type App = ReturnType<typeof buildApp>;

export const startServer = (port = Number(process.env.PORT) || 3001) => {
  const app = buildApp();

  if (process.env.ENRICH_WORKER_ENABLED !== 'false') {
    try {
      startEnrichmentWorker();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[server] failed to start enrichment worker', error?.message || err);
    }
  }

  // Use Bun's native server with Elysia
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(
    `🦊 Elysia is running at http://${server.hostname}:${server.port}`
  );

  return server;
};
