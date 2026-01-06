/**
 * Realtime Enrichment Hook
 * 
 * Provides real-time updates for cell enrichment jobs using Trigger.dev Realtime.
 * This hook subscribes to a Trigger.dev run and receives live updates as the
 * enrichment workflow progresses.
 */

'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { useRealtimeRun } from '@trigger.dev/react-hooks';

export interface EnrichmentProgress {
    /** Current status of the enrichment run */
    status: 'PENDING' | 'QUEUED' | 'EXECUTING' | 'REATTEMPTING' | 'FROZEN' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'CRASHED' | 'INTERRUPTED' | 'SYSTEM_FAILURE' | 'DELAYED' | 'EXPIRED' | 'TIMED_OUT';
    /** Whether the run is currently active */
    isActive: boolean;
    /** Whether the run has completed (successfully or not) */
    isComplete: boolean;
    /** Whether the run was successful */
    isSuccess: boolean;
    /** Error message if the run failed */
    error?: string;
    /** Output from the run when completed */
    output?: {
        jobId: string;
        status: string;
        totalTasks: number;
        successCount: number;
        failCount: number;
    };
    /** Progress metadata (if available from the task) */
    progress?: number;
    /** The Trigger.dev run object */
    run?: unknown;
}

export interface UseRealtimeEnrichmentOptions {
    /** Run ID from Trigger.dev */
    runId?: string;
    /** Public access token for authentication */
    publicAccessToken?: string;
    /** Callback when enrichment completes */
    onComplete?: (success: boolean, output?: EnrichmentProgress['output']) => void;
    /** Whether to automatically refresh data when complete */
    refreshOnComplete?: boolean;
}

/**
 * Hook to subscribe to real-time enrichment updates via Trigger.dev
 * 
 * @example
 * ```tsx
 * const { progress, isActive, isComplete } = useRealtimeEnrichment({
 *   runId: 'run_xxx',
 *   publicAccessToken: 'xxx',
 *   onComplete: (success) => {
 *     if (success) loadData();
 *   },
 * });
 * ```
 */
export function useRealtimeEnrichment(options: UseRealtimeEnrichmentOptions): EnrichmentProgress {
    const { runId, publicAccessToken, onComplete, refreshOnComplete } = options;

    const [hasNotified, setHasNotified] = useState(false);
    
    // Store onComplete in ref to prevent dependency issues
    const onCompleteRef = useRef(onComplete);
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Use Trigger.dev's realtime hook to subscribe to run updates
    const { run, error } = useRealtimeRun(runId ?? '', {
        accessToken: publicAccessToken ?? '',
        enabled: Boolean(runId && publicAccessToken),
    });

    // Log connection errors
    useEffect(() => {
        if (error) {
            console.error('[useRealtimeEnrichment] Connection error:', {
                runId,
                error: error.message,
            });
        }
    }, [error, runId]);

    // Derive status from run object
    const status = (run?.status ?? 'PENDING') as EnrichmentProgress['status'];

    const isActive = ['PENDING', 'QUEUED', 'EXECUTING', 'REATTEMPTING', 'DELAYED'].includes(status);
    const isComplete = ['COMPLETED', 'FAILED', 'CANCELLED', 'CRASHED', 'INTERRUPTED', 'SYSTEM_FAILURE', 'EXPIRED', 'TIMED_OUT'].includes(status);
    const isSuccess = status === 'COMPLETED';

    // Log status changes for debugging
    useEffect(() => {
        if (runId) {
            console.log('[useRealtimeEnrichment] Status update:', {
                runId,
                status,
                isActive,
                isComplete,
                isSuccess,
                hasNotified,
                output: run?.output,
            });
        }
    }, [runId, status, isActive, isComplete, isSuccess, hasNotified, run?.output]);

    // Handle completion callback
    useEffect(() => {
        if (isComplete && !hasNotified && runId) {
            console.log('[useRealtimeEnrichment] Completion detected:', {
                runId,
                isSuccess,
                status,
                output: run?.output,
                hasCallback: Boolean(onCompleteRef.current),
            });
            setHasNotified(true);
            
            // Call completion callback immediately
            const output = run?.output as EnrichmentProgress['output'];
            if (onCompleteRef.current) {
                console.log('[useRealtimeEnrichment] Executing completion callback NOW');
                onCompleteRef.current(isSuccess, output);
            } else {
                console.warn('[useRealtimeEnrichment] No completion callback provided');
            }
        }
    }, [isComplete, hasNotified, runId, isSuccess, status, run?.output]);

    // Reset notification flag when run changes
    useEffect(() => {
        if (runId) {
            console.log('[useRealtimeEnrichment] New run started:', runId);
            setHasNotified(false);
        }
    }, [runId]);

    return {
        status,
        isActive,
        isComplete,
        isSuccess,
        error: error?.message,
        output: run?.output as EnrichmentProgress['output'],
        run,
    };
}

/**
 * State management for enrichment jobs with realtime updates
 */
export interface EnrichmentJobState {
    /** Job ID from our database */
    jobId: string;
    /** Trigger.dev run ID */
    runId: string;
    /** Public access token */
    publicAccessToken: string;
    /** Cells being enriched (format: "rowId:columnKey") */
    enrichingCells: Set<string>;
}

/**
 * Hook to manage multiple enrichment jobs with realtime updates
 */
export function useEnrichmentJobsManager() {
    const [activeJob, setActiveJob] = useState<EnrichmentJobState | null>(null);

    const startJob = useCallback((
        jobId: string,
        runId: string,
        publicAccessToken: string,
        enrichingCells: Set<string>
    ) => {
        setActiveJob({
            jobId,
            runId,
            publicAccessToken,
            enrichingCells,
        });
    }, []);

    const clearJob = useCallback(() => {
        setActiveJob(null);
    }, []);

    return {
        activeJob,
        startJob,
        clearJob,
        hasActiveJob: activeJob !== null,
    };
}
