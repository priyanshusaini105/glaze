/**
 * Circuit Breaker Pattern Implementation
 * 
 * Automatically detects and avoids flaky or expensive providers.
 * Implements the three-state circuit breaker pattern:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Provider is failing, requests are rejected immediately
 * - HALF_OPEN: Testing if provider has recovered
 * 
 * Also tracks metrics for auto-tuning provider selection.
 */

import { logger } from '@trigger.dev/sdk';

// ============ Types ============

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
    /** Number of failures before opening the circuit */
    failureThreshold: number;
    /** Time in ms before attempting to recover (half-open) */
    resetTimeoutMs: number;
    /** Number of successful calls needed to close the circuit */
    successThreshold: number;
    /** Window size in ms for calculating failure rate */
    windowMs: number;
    /** Minimum requests before circuit can open */
    minimumRequests: number;
}

export interface ProviderMetrics {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    timeouts: number;
    totalLatencyMs: number;
    lastCallTime: number;
    lastError?: string;
    latencyP50: number;
    latencyP95: number;
    latencyP99: number;
    avgCostCents: number;
    errorRate: number;
}

export interface CircuitBreakerStatus {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailureTime: number;
    lastSuccessTime: number;
    nextRetryTime: number | null;
}

// ============ Configuration ============

const DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,      // 30 seconds
    successThreshold: 3,
    windowMs: 60000,            // 1 minute
    minimumRequests: 10,
};

// ============ Circuit Breaker Implementation ============

export class CircuitBreaker {
    private state: CircuitState = 'closed';
    private failures = 0;
    private successes = 0;
    private lastFailureTime = 0;
    private lastSuccessTime = 0;
    private config: CircuitBreakerConfig;
    private name: string;

    // Rolling window for metrics
    private recentCalls: Array<{
        timestamp: number;
        success: boolean;
        latencyMs: number;
        costCents: number;
    }> = [];

    constructor(name: string, config: Partial<CircuitBreakerConfig> = {}) {
        this.name = name;
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Check if the circuit allows requests
     */
    canRequest(): boolean {
        this.cleanupOldCalls();

        if (this.state === 'closed') {
            return true;
        }

        if (this.state === 'open') {
            // Check if we should try half-open
            const timeSinceFailure = Date.now() - this.lastFailureTime;
            if (timeSinceFailure >= this.config.resetTimeoutMs) {
                this.state = 'half_open';
                logger.info('🔄 Circuit breaker entering half-open state', {
                    provider: this.name,
                    timeSinceFailureMs: timeSinceFailure,
                });
                return true;
            }
            return false;
        }

        // Half-open: allow limited requests
        return true;
    }

    /**
     * Record a successful call
     */
    recordSuccess(latencyMs: number, costCents: number = 0): void {
        this.lastSuccessTime = Date.now();
        this.successes++;

        this.recentCalls.push({
            timestamp: Date.now(),
            success: true,
            latencyMs,
            costCents,
        });

        if (this.state === 'half_open') {
            if (this.successes >= this.config.successThreshold) {
                this.state = 'closed';
                this.failures = 0;
                logger.info('✅ Circuit breaker closed (recovered)', {
                    provider: this.name,
                    successCount: this.successes,
                });
            }
        } else if (this.state === 'closed') {
            // Reset failure count on success
            this.failures = Math.max(0, this.failures - 1);
        }
    }

    /**
     * Record a failed call
     */
    recordFailure(error: string, latencyMs: number = 0): void {
        this.lastFailureTime = Date.now();
        this.failures++;

        this.recentCalls.push({
            timestamp: Date.now(),
            success: false,
            latencyMs,
            costCents: 0,
        });

        if (this.state === 'half_open') {
            // Immediately open circuit on failure in half-open state
            this.state = 'open';
            this.successes = 0;
            logger.warn('🔴 Circuit breaker reopened (half-open failed)', {
                provider: this.name,
                error,
            });
        } else if (this.state === 'closed') {
            // Check if we should open the circuit
            const recentCalls = this.getRecentCalls();
            if (recentCalls.length >= this.config.minimumRequests &&
                this.failures >= this.config.failureThreshold) {
                this.state = 'open';
                this.successes = 0;
                logger.warn('🔴 Circuit breaker opened', {
                    provider: this.name,
                    failures: this.failures,
                    threshold: this.config.failureThreshold,
                    error,
                });
            }
        }
    }

    /**
     * Record a timeout
     */
    recordTimeout(timeoutMs: number): void {
        this.recordFailure(`Timeout after ${timeoutMs}ms`, timeoutMs);
    }

    /**
     * Get current circuit status
     */
    getStatus(): CircuitBreakerStatus {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailureTime: this.lastFailureTime,
            lastSuccessTime: this.lastSuccessTime,
            nextRetryTime: this.state === 'open'
                ? this.lastFailureTime + this.config.resetTimeoutMs
                : null,
        };
    }

    /**
     * Get provider metrics from recent calls
     */
    getMetrics(): ProviderMetrics {
        this.cleanupOldCalls();

        const calls = this.recentCalls;
        const successful = calls.filter(c => c.success);
        const failed = calls.filter(c => !c.success);

        const latencies = calls.map(c => c.latencyMs).sort((a, b) => a - b);
        const totalLatency = latencies.reduce((sum, l) => sum + l, 0);
        const totalCost = calls.reduce((sum, c) => sum + c.costCents, 0);

        return {
            totalCalls: calls.length,
            successfulCalls: successful.length,
            failedCalls: failed.length,
            timeouts: failed.filter(c => c.latencyMs > 10000).length,
            totalLatencyMs: totalLatency,
            lastCallTime: calls.length > 0 ? calls[calls.length - 1]!.timestamp : 0,
            latencyP50: latencies[Math.floor(latencies.length * 0.5)] ?? 0,
            latencyP95: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
            latencyP99: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
            avgCostCents: calls.length > 0 ? totalCost / calls.length : 0,
            errorRate: calls.length > 0 ? failed.length / calls.length : 0,
        };
    }

    /**
     * Force circuit to a specific state (for testing/admin)
     */
    forceState(state: CircuitState): void {
        this.state = state;
        if (state === 'closed') {
            this.failures = 0;
            this.successes = 0;
        }
        logger.info('⚡ Circuit breaker force-set', {
            provider: this.name,
            state,
        });
    }

    /**
     * Reset the circuit breaker
     */
    reset(): void {
        this.state = 'closed';
        this.failures = 0;
        this.successes = 0;
        this.recentCalls = [];
        logger.info('🔄 Circuit breaker reset', { provider: this.name });
    }

    // ============ Private Methods ============

    private cleanupOldCalls(): void {
        const cutoff = Date.now() - this.config.windowMs;
        this.recentCalls = this.recentCalls.filter(c => c.timestamp > cutoff);
    }

    private getRecentCalls(): typeof this.recentCalls {
        this.cleanupOldCalls();
        return this.recentCalls;
    }
}

// ============ Circuit Breaker Registry ============

class CircuitBreakerRegistry {
    private breakers = new Map<string, CircuitBreaker>();
    private defaultConfig: Partial<CircuitBreakerConfig>;

    constructor(defaultConfig: Partial<CircuitBreakerConfig> = {}) {
        this.defaultConfig = defaultConfig;
    }

    /**
     * Get or create a circuit breaker for a provider
     */
    get(providerName: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
        let breaker = this.breakers.get(providerName);
        if (!breaker) {
            breaker = new CircuitBreaker(providerName, {
                ...this.defaultConfig,
                ...config,
            });
            this.breakers.set(providerName, breaker);
        }
        return breaker;
    }

    /**
     * Get status of all circuit breakers
     */
    getAllStatus(): Map<string, CircuitBreakerStatus> {
        const status = new Map<string, CircuitBreakerStatus>();
        for (const [name, breaker] of this.breakers) {
            status.set(name, breaker.getStatus());
        }
        return status;
    }

    /**
     * Get metrics for all providers
     */
    getAllMetrics(): Map<string, ProviderMetrics> {
        const metrics = new Map<string, ProviderMetrics>();
        for (const [name, breaker] of this.breakers) {
            metrics.set(name, breaker.getMetrics());
        }
        return metrics;
    }

    /**
     * Get providers sorted by health (for smart routing)
     */
    getHealthyProviders(): string[] {
        const providers: Array<{ name: string; score: number }> = [];

        for (const [name, breaker] of this.breakers) {
            if (!breaker.canRequest()) continue;

            const metrics = breaker.getMetrics();
            // Score: higher is better (low error rate, low latency)
            const score = (1 - metrics.errorRate) * 100 - (metrics.latencyP50 / 100);
            providers.push({ name, score });
        }

        return providers
            .sort((a, b) => b.score - a.score)
            .map(p => p.name);
    }

    /**
     * Reset all circuit breakers
     */
    resetAll(): void {
        for (const breaker of this.breakers.values()) {
            breaker.reset();
        }
    }
}

// ============ Singleton Instance ============

export const circuitBreakers = new CircuitBreakerRegistry({
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    successThreshold: 3,
    windowMs: 60000,
    minimumRequests: 10,
});

// ============ Utility Functions ============

/**
 * Execute a function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
    providerName: string,
    fn: () => Promise<T>,
    costCents: number = 0
): Promise<T> {
    const breaker = circuitBreakers.get(providerName);

    if (!breaker.canRequest()) {
        const status = breaker.getStatus();
        throw new Error(
            `Circuit breaker open for ${providerName}. ` +
            `Next retry at ${new Date(status.nextRetryTime!).toISOString()}`
        );
    }

    const startTime = Date.now();
    try {
        const result = await fn();
        const latencyMs = Date.now() - startTime;
        breaker.recordSuccess(latencyMs, costCents);
        return result;
    } catch (error) {
        const latencyMs = Date.now() - startTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        breaker.recordFailure(errorMsg, latencyMs);
        throw error;
    }
}

/**
 * Check if a provider is available
 */
export function isProviderAvailable(providerName: string): boolean {
    return circuitBreakers.get(providerName).canRequest();
}

/**
 * Get provider health summary for logging
 */
export function getProviderHealthSummary(): Record<string, {
    state: CircuitState;
    errorRate: number;
    latencyP50: number;
}> {
    const summary: Record<string, { state: CircuitState; errorRate: number; latencyP50: number }> = {};

    for (const [name, status] of circuitBreakers.getAllStatus()) {
        const metrics = circuitBreakers.get(name).getMetrics();
        summary[name] = {
            state: status.state,
            errorRate: metrics.errorRate,
            latencyP50: metrics.latencyP50,
        };
    }

    return summary;
}
