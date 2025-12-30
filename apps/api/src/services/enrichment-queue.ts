import { Queue, Worker, JobsOptions, QueueOptions } from 'bullmq';
import { getBullMQConnection } from '../utils/redis';
import { EnrichmentJobInput, EnrichmentJobResult, EnrichmentJobStatus } from '../types/enrichment';
import { runEnrichmentPipeline, normalizeInput } from './enrichment-pipeline';

const QUEUE_NAME = 'enrichment';

const redis = getBullMQConnection();

const defaultJobOptions: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 100,
  attempts: 2,
  backoff: {
    type: 'exponential',
    delay: 2000
  }
};

const queueOptions: QueueOptions = {
  connection: redis,
  defaultJobOptions
};

export const enrichmentQueue = new Queue<EnrichmentJobInput, EnrichmentJobResult>(
  QUEUE_NAME,
  queueOptions
);

export const enqueueEnrichment = async (payload: Omit<EnrichmentJobInput, 'normalizedUrl' | 'detectedInputType' | 'requestedAt'> & { requestedAt?: string }) => {
  // Normalize input and detect type
  const { normalizedUrl, inputType } = normalizeInput(payload.url);
  
  const fullPayload: EnrichmentJobInput = {
    ...payload,
    requestedAt: payload.requestedAt || new Date().toISOString(),
    normalizedUrl,
    detectedInputType: payload.inputType || inputType,
    budgetCents: payload.budgetCents ?? 0,
    mock: payload.mock ?? false,
    skipCache: payload.skipCache ?? false
  };

  const job = await enrichmentQueue.add('enrich', fullPayload, defaultJobOptions);
  return job.id as string;
};

export const getJobStatus = async (jobId: string): Promise<EnrichmentJobStatus | null> => {
  const job = await enrichmentQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const result = state === 'completed' ? ((job.returnvalue as EnrichmentJobResult | undefined) ?? null) : null;
  const failedReason = state === 'failed' ? job.failedReason : undefined;

  return {
    id: job.id as string,
    state: state as EnrichmentJobStatus['state'],
    progress: typeof job.progress === 'number' ? job.progress : undefined,
    result: result || (failedReason ? {
      data: {},
      gaps: job.data.requiredFields,
      cost: { totalCents: 0, breakdown: [] },
      provenance: [],
      notes: [`Job failed: ${failedReason}`],
      status: 'failed',
      error: failedReason
    } : null),
    attemptsMade: job.attemptsMade,
    createdAt: job.timestamp ? new Date(job.timestamp).toISOString() : undefined
  };
};

export const startEnrichmentWorker = () => {
  const worker = new Worker<EnrichmentJobInput, EnrichmentJobResult>(
    QUEUE_NAME,
    async (job) => {
      console.log(`[enrichment-worker] Processing job ${job.id}: ${job.data.normalizedUrl}`);
      
      // Check if mock mode
      if (job.data.mock) {
        job.updateProgress(10);
        console.log(`[enrichment-worker] Mock mode for job ${job.id}`);
        
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 500));
        job.updateProgress(50);
        await new Promise((resolve) => setTimeout(resolve, 500));
        job.updateProgress(100);

        return {
          data: {},
          gaps: job.data.requiredFields,
          cost: { totalCents: 0, breakdown: [] },
          provenance: [],
          notes: ['Mock mode: no real enrichment performed'],
          status: 'completed' as const,
          completedAt: new Date().toISOString()
        };
      }

      // Run the real waterfall pipeline
      return await runEnrichmentPipeline(job);
    },
    {
      connection: redis,
      concurrency: 3 // Process up to 3 jobs in parallel
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[enrichment-worker] Job ${job.id} completed. Gaps: ${result.gaps.length}, Cost: $${(result.cost.totalCents / 100).toFixed(2)}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[enrichment-worker] Job ${job?.id} failed:`, err?.message || err);
  });

  worker.on('error', (err) => {
    console.error('[enrichment-worker] Worker error:', err?.message || err);
  });

  console.log('[enrichment-worker] Worker started');
  return worker;
};
