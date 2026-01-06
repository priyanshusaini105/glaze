/**
 * Entity-Based Enrichment Hook
 * 
 * Production-optimized hook for tracking entity-based enrichment progress.
 * Provides real-time updates at the entity level (not cell level) for better
 * performance and user experience.
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRealtimeRun } from '@trigger.dev/react-hooks';

// ===== Types =====

export interface EntityEnrichmentProgress {
  /** Current status of the enrichment run */
  status:
    | 'PENDING'
    | 'QUEUED'
    | 'EXECUTING'
    | 'REATTEMPTING'
    | 'FROZEN'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED'
    | 'CRASHED'
    | 'INTERRUPTED'
    | 'SYSTEM_FAILURE'
    | 'DELAYED'
    | 'EXPIRED'
    | 'TIMED_OUT';
  /** Whether the run is currently active */
  isActive: boolean;
  /** Whether the run has completed (successfully or not) */
  isComplete: boolean;
  /** Whether the run was successful */
  isSuccess: boolean;
  /** Error message if the run failed */
  error?: string;
  /** Entity-level progress */
  entityProgress: {
    /** Total entities to process */
    total: number;
    /** Entities processed so far */
    processed: number;
    /** Percentage complete */
    percent: number;
  };
  /** Row-level progress (derived from entities) */
  rowProgress: {
    /** Total rows affected */
    total: number;
    /** Rows updated so far */
    updated: number;
    /** Percentage complete */
    percent: number;
  };
  /** Cost tracking */
  cost: {
    /** Total cost in cents */
    totalCents: number;
    /** Estimated remaining cost */
    estimatedRemainingCents: number;
  };
  /** Output from the run when completed */
  output?: {
    jobId: string;
    status: string;
    successCount: number;
    failCount: number;
    cellsUpdated: number;
    totalCostCents: number;
    processingTimeMs: number;
  };
  /** Metadata from Trigger.dev */
  metadata?: {
    entitiesProcessed?: number;
    totalEntities?: number;
    status?: string;
    costCents?: number;
  };
  /** The Trigger.dev run object */
  run?: unknown;
}

export interface UseEntityEnrichmentOptions {
  /** Run ID from Trigger.dev */
  runId?: string;
  /** Public access token for authentication */
  publicAccessToken?: string;
  /** Total entity count (from API response) */
  totalEntities?: number;
  /** Total row count (from API response) */
  totalRows?: number;
  /** Callback when enrichment completes */
  onComplete?: (success: boolean, output?: EntityEnrichmentProgress['output']) => void;
  /** Callback when progress updates */
  onProgress?: (progress: EntityEnrichmentProgress) => void;
}

// ===== Hook =====

/**
 * Hook to subscribe to real-time entity enrichment updates via Trigger.dev
 * 
 * @example
 * ```tsx
 * const { progress, isActive, isComplete } = useEntityEnrichment({
 *   runId: 'run_xxx',
 *   publicAccessToken: 'xxx',
 *   totalEntities: 10,
 *   totalRows: 100,
 *   onComplete: (success) => {
 *     if (success) refreshTableData();
 *   },
 * });
 * 
 * return (
 *   <ProgressBar 
 *     value={progress.entityProgress.percent} 
 *     label={`${progress.entityProgress.processed}/${progress.entityProgress.total} entities`}
 *   />
 * );
 * ```
 */
export function useEntityEnrichment(
  options: UseEntityEnrichmentOptions
): EntityEnrichmentProgress {
  const {
    runId,
    publicAccessToken,
    totalEntities = 0,
    totalRows = 0,
    onComplete,
    onProgress,
  } = options;

  const [hasNotified, setHasNotified] = useState(false);
  const [lastProgress, setLastProgress] = useState<EntityEnrichmentProgress | null>(null);

  // Use Trigger.dev's realtime hook
  const { run, error } = useRealtimeRun(runId ?? '', {
    accessToken: publicAccessToken ?? '',
    enabled: Boolean(runId && publicAccessToken),
  });

  // Derive status
  const status = (run?.status ?? 'PENDING') as EntityEnrichmentProgress['status'];
  const isActive = ['PENDING', 'QUEUED', 'EXECUTING', 'REATTEMPTING', 'DELAYED'].includes(status);
  const isComplete = [
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'CRASHED',
    'INTERRUPTED',
    'SYSTEM_FAILURE',
    'EXPIRED',
    'TIMED_OUT',
  ].includes(status);
  const isSuccess = status === 'COMPLETED';

  // Extract metadata from run
  const metadata = useMemo(() => {
    if (!run) return undefined;
    // Trigger.dev stores metadata in run.metadata
    const runMeta = (run as any)?.metadata;
    if (runMeta?.progress) {
      return runMeta.progress;
    }
    return undefined;
  }, [run]);

  // Calculate progress
  const progress: EntityEnrichmentProgress = useMemo(() => {
    const entitiesProcessed = metadata?.entitiesProcessed ?? 0;
    const entitiesTotal = metadata?.totalEntities ?? totalEntities;
    const costCents = metadata?.costCents ?? 0;

    // Entity progress
    const entityProgress = {
      total: entitiesTotal,
      processed: entitiesProcessed,
      percent: entitiesTotal > 0 ? Math.round((entitiesProcessed / entitiesTotal) * 100) : 0,
    };

    // Estimate row progress based on entity progress
    const rowsUpdated = Math.round((entitiesProcessed / Math.max(entitiesTotal, 1)) * totalRows);
    const rowProgress = {
      total: totalRows,
      updated: rowsUpdated,
      percent: totalRows > 0 ? Math.round((rowsUpdated / totalRows) * 100) : 0,
    };

    // Cost tracking
    const estimatedRemainingCents = entitiesTotal > 0
      ? Math.round(((entitiesTotal - entitiesProcessed) / entitiesTotal) * costCents * (entitiesTotal / Math.max(entitiesProcessed, 1)))
      : 0;

    return {
      status,
      isActive,
      isComplete,
      isSuccess,
      error: error?.message,
      entityProgress,
      rowProgress,
      cost: {
        totalCents: costCents,
        estimatedRemainingCents,
      },
      output: run?.output as EntityEnrichmentProgress['output'],
      metadata,
      run,
    };
  }, [status, isActive, isComplete, isSuccess, error, metadata, totalEntities, totalRows, run]);

  // Handle completion callback
  useEffect(() => {
    if (isComplete && !hasNotified && onComplete) {
      setHasNotified(true);
      onComplete(isSuccess, progress.output);
    }
  }, [isComplete, hasNotified, onComplete, isSuccess, progress.output]);

  // Handle progress callback
  useEffect(() => {
    if (onProgress && progress !== lastProgress) {
      setLastProgress(progress);
      onProgress(progress);
    }
  }, [progress, lastProgress, onProgress]);

  // Reset notification flag when run changes
  useEffect(() => {
    if (runId) {
      setHasNotified(false);
      setLastProgress(null);
    }
  }, [runId]);

  return progress;
}

// ===== Job Manager Hook =====

export interface EntityEnrichmentJob {
  jobId: string;
  runId: string;
  publicAccessToken: string;
  tableId: string;
  entityCount: number;
  cellCount: number;
  startedAt: Date;
}

/**
 * Hook to manage multiple entity enrichment jobs
 */
export function useEntityEnrichmentManager() {
  const [activeJob, setActiveJob] = useState<EntityEnrichmentJob | null>(null);
  const [jobHistory, setJobHistory] = useState<EntityEnrichmentJob[]>([]);

  const startJob = useCallback(
    (job: Omit<EntityEnrichmentJob, 'startedAt'>) => {
      const newJob: EntityEnrichmentJob = {
        ...job,
        startedAt: new Date(),
      };
      setActiveJob(newJob);
      setJobHistory(prev => [newJob, ...prev.slice(0, 9)]); // Keep last 10 jobs
    },
    []
  );

  const clearJob = useCallback(() => {
    setActiveJob(null);
  }, []);

  const getJobById = useCallback(
    (jobId: string) => {
      if (activeJob?.jobId === jobId) return activeJob;
      return jobHistory.find(j => j.jobId === jobId);
    },
    [activeJob, jobHistory]
  );

  return {
    activeJob,
    jobHistory,
    startJob,
    clearJob,
    getJobById,
    hasActiveJob: activeJob !== null,
  };
}

// ===== Utility Hooks =====

/**
 * Hook to start an entity enrichment job and track its progress
 */
export function useStartEntityEnrichment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobData, setJobData] = useState<{
    jobId: string;
    runId: string;
    publicAccessToken: string;
    entityCount: number;
    cellCount: number;
  } | null>(null);

  const startEnrichment = useCallback(
    async (
      tableId: string,
      columnIds: string[],
      rowIds?: string[],
      options?: {
        budgetCents?: number;
        skipCache?: boolean;
      }
    ) => {
      setIsLoading(true);
      setError(null);
      setJobData(null);

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v2/tables/${tableId}/enrich`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              columnIds,
              rowIds,
              budgetCents: options?.budgetCents,
              skipCache: options?.skipCache,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to start enrichment');
        }

        const data = await response.json();

        setJobData({
          jobId: data.jobId,
          runId: data.runId,
          publicAccessToken: data.publicAccessToken,
          entityCount: data.entityCount,
          cellCount: data.cellCount,
        });

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setJobData(null);
  }, []);

  return {
    startEnrichment,
    isLoading,
    error,
    jobData,
    reset,
  };
}
