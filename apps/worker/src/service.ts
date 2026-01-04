/**
 * Worker Service
 * 
 * Background process that:
 * - Listens to enrichment job queue (Redis/BullMQ)
 * - Executes enrichment pipeline
 * - Handles retries and failures
 * - Reports progress back to API
 */

import { Worker } from "bullmq";
import { createEnrichmentPipeline } from "./pipeline";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const QUEUE_NAME = process.env.QUEUE_NAME || "enrichment";

export const startWorker = async () => {
  const pipeline = createEnrichmentPipeline();

  const worker = new Worker(QUEUE_NAME, async (job) => {
    try {
      console.log(`[worker] Starting job: ${job.id}`);
      const result = await pipeline.execute(job);
      console.log(`[worker] Job completed: ${job.id}`);
      return result;
    } catch (error) {
      console.error(`[worker] Job failed: ${job.id}`, error);
      throw error;
    }
  });

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[worker] Worker error:", err);
  });

  console.log(`[worker] Started on queue: ${QUEUE_NAME}`);
  return worker;
};

export const stopWorker = async (worker: Worker) => {
  await worker.close();
  console.log("[worker] Worker stopped");
};
