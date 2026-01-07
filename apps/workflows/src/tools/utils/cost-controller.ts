/**
 * Cost Controller
 *
 * Tracks and enforces cost budgets for enrichment jobs.
 */

import { logger } from "@trigger.dev/sdk";

export interface CostControllerState {
    jobId: string;
    budgetCents: number;
    spentCents: number;
    providerCalls: Record<string, number>;
}

const jobStates = new Map<string, CostControllerState>();

/**
 * Initialize cost controller for a job.
 */
export function initCostController(jobId: string, budgetCents: number): void {
    jobStates.set(jobId, {
        jobId,
        budgetCents,
        spentCents: 0,
        providerCalls: {},
    });
    logger.info("💰 Cost controller initialized", { jobId, budgetCents });
}

/**
 * Check if a provider call is allowed within budget.
 */
export function canSpend(jobId: string, costCents: number): boolean {
    const state = jobStates.get(jobId);
    if (!state) return false;

    const allowed = state.spentCents + costCents <= state.budgetCents;
    if (!allowed) {
        logger.warn("💰 Budget exceeded", {
            jobId,
            spent: state.spentCents,
            budget: state.budgetCents,
            requested: costCents,
        });
    }
    return allowed;
}

/**
 * Record a cost expenditure.
 */
export function recordSpend(jobId: string, providerName: string, costCents: number): void {
    const state = jobStates.get(jobId);
    if (!state) return;

    state.spentCents += costCents;
    state.providerCalls[providerName] = (state.providerCalls[providerName] || 0) + 1;

    logger.info("💰 Cost recorded", {
        jobId,
        provider: providerName,
        cost: costCents,
        totalSpent: state.spentCents,
        remaining: state.budgetCents - state.spentCents,
    });
}

/**
 * Get remaining budget.
 */
export function getRemainingBudget(jobId: string): number {
    const state = jobStates.get(jobId);
    if (!state) return 0;
    return state.budgetCents - state.spentCents;
}

/**
 * Get cost summary for a job.
 */
export function getCostSummary(jobId: string): CostControllerState | null {
    return jobStates.get(jobId) || null;
}

/**
 * Clear job state (cleanup).
 */
export function clearCostController(jobId: string): void {
    jobStates.delete(jobId);
}
