/**
 * Singleflight Pattern Implementation
 * 
 * Coalesces concurrent requests for the same key into a single execution.
 * Prevents duplicate provider calls when multiple tasks request the same data.
 * 
 * Example: If 5 concurrent requests come in for (row123, company_name),
 * only ONE provider call is made, and all 5 requests share the result.
 * 
 * This is critical for batch enrichment where many cells in a row
 * might need the same provider data.
 */

import { logger } from '@trigger.dev/sdk';

// ============ Types ============

interface InflightRequest<T> {
    promise: Promise<T>;
    startTime: number;
    waiters: number;
}

interface SingleflightStats {
    totalRequests: number;
    coalescedRequests: number;
    executedRequests: number;
    errors: number;
    avgWaitersPerRequest: number;
}

// ============ Singleflight Implementation ============

export class Singleflight<T> {
    private inflight = new Map<string, InflightRequest<T>>();
    private stats = {
        totalRequests: 0,
        coalescedRequests: 0,
        executedRequests: 0,
        errors: 0,
        totalWaiters: 0,
    };

    /**
     * Execute a function for a key, coalescing concurrent calls
     * 
     * If a request for this key is already in flight, return its promise.
     * Otherwise, execute the function and share the result with any
     * concurrent callers.
     */
    async do(key: string, fn: () => Promise<T>): Promise<T> {
        this.stats.totalRequests++;

        // Check if request is already in flight
        const existing = this.inflight.get(key);
        if (existing) {
            existing.waiters++;
            this.stats.coalescedRequests++;
            this.stats.totalWaiters++;

            logger.info('🔗 Singleflight coalesced request', {
                key,
                waiters: existing.waiters,
                waitTimeMs: Date.now() - existing.startTime,
            });

            return existing.promise;
        }

        // Create new in-flight request
        this.stats.executedRequests++;

        const request: InflightRequest<T> = {
            promise: fn().finally(() => {
                // Clean up after completion
                const req = this.inflight.get(key);
                if (req) {
                    logger.info('🏁 Singleflight request completed', {
                        key,
                        waiters: req.waiters,
                        durationMs: Date.now() - req.startTime,
                    });
                }
                this.inflight.delete(key);
            }).catch((error) => {
                this.stats.errors++;
                throw error;
            }),
            startTime: Date.now(),
            waiters: 1,
        };

        this.inflight.set(key, request);
        this.stats.totalWaiters++;

        return request.promise;
    }

    /**
     * Check if a request is currently in flight for a key
     */
    isInflight(key: string): boolean {
        return this.inflight.has(key);
    }

    /**
     * Get the number of in-flight requests
     */
    getInflightCount(): number {
        return this.inflight.size;
    }

    /**
     * Get statistics about singleflight usage
     */
    getStats(): SingleflightStats {
        return {
            totalRequests: this.stats.totalRequests,
            coalescedRequests: this.stats.coalescedRequests,
            executedRequests: this.stats.executedRequests,
            errors: this.stats.errors,
            avgWaitersPerRequest: this.stats.executedRequests > 0
                ? this.stats.totalWaiters / this.stats.executedRequests
                : 0,
        };
    }

    /**
     * Reset statistics
     */
    resetStats(): void {
        this.stats = {
            totalRequests: 0,
            coalescedRequests: 0,
            executedRequests: 0,
            errors: 0,
            totalWaiters: 0,
        };
    }

    /**
     * Clear all in-flight requests (use with caution)
     */
    clear(): void {
        this.inflight.clear();
    }
}

// ============ Specialized Singleflight Groups ============

/**
 * Singleflight for cell enrichment
 * Key format: rowId:field
 * Note: Uses 'unknown' type to allow different callers to use different return types
 */
export const cellEnrichmentFlight = new Singleflight<unknown>();

/**
 * Singleflight for provider calls
 * Key format: rowId:provider
 * Note: Uses 'unknown' type to allow different callers to use different return types  
 */
export const providerCallFlight = new Singleflight<unknown>();

// ============ Helper Functions ============

/**
 * Build a singleflight key for cell enrichment
 */
export function buildCellFlightKey(rowId: string, field: string): string {
    return `cell:${rowId}:${field}`;
}

/**
 * Build a singleflight key for provider calls
 */
export function buildProviderFlightKey(rowId: string, provider: string): string {
    return `provider:${rowId}:${provider}`;
}

/**
 * Get combined stats from all singleflight groups
 */
export function getSingleflightStats(): {
    cell: SingleflightStats;
    provider: SingleflightStats;
} {
    return {
        cell: cellEnrichmentFlight.getStats(),
        provider: providerCallFlight.getStats(),
    };
}
