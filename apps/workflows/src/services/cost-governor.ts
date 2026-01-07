/**
 * Cost Governor Service
 * 
 * Tracks and controls enrichment costs:
 * - Per-user/team budget tracking
 * - Provider cost monitoring
 * - Throttling expensive providers
 * - Budget alerts and limits
 */

import { logger } from "@trigger.dev/sdk";
import type { ProviderTier } from "../types/enrichment";

/**
 * Budget configuration
 */
export interface BudgetConfig {
    /** Total budget in cents */
    totalCents: number;
    /** Warning threshold (0-1, e.g., 0.8 = warn at 80%) */
    warningThreshold: number;
    /** Per-row limit in cents */
    perRowLimitCents: number;
    /** Per-provider limits */
    providerLimits?: Record<string, number>;
}

/**
 * Cost tracking entry
 */
export interface CostEntry {
    id: string;
    rowId: string;
    tableId: string;
    provider: string;
    field: string;
    costCents: number;
    timestamp: string;
}

/**
 * Budget status
 */
export interface BudgetStatus {
    totalBudgetCents: number;
    usedCents: number;
    remainingCents: number;
    percentUsed: number;
    isWarning: boolean;
    isExhausted: boolean;
    breakdown: Record<string, number>;
}

/**
 * Default budget configuration
 */
const DEFAULT_BUDGET_CONFIG: BudgetConfig = {
    totalCents: 10000, // $100 default
    warningThreshold: 0.8,
    perRowLimitCents: 50,
    providerLimits: {
        linkedin_api: 3000, // $30 max for LinkedIn
        email_verifier: 1000, // $10 max for email verification
    },
};

/**
 * In-memory cost store (should be persisted to DB in production)
 */
class CostStore {
    private entries: CostEntry[] = [];
    private totalUsed: number = 0;
    private byProvider: Map<string, number> = new Map();
    private byRow: Map<string, number> = new Map();
    
    add(entry: CostEntry): void {
        this.entries.push(entry);
        this.totalUsed += entry.costCents;
        
        // Track by provider
        const providerTotal = this.byProvider.get(entry.provider) ?? 0;
        this.byProvider.set(entry.provider, providerTotal + entry.costCents);
        
        // Track by row
        const rowTotal = this.byRow.get(entry.rowId) ?? 0;
        this.byRow.set(entry.rowId, rowTotal + entry.costCents);
    }
    
    getTotalUsed(): number {
        return this.totalUsed;
    }
    
    getByProvider(): Record<string, number> {
        return Object.fromEntries(this.byProvider);
    }
    
    getByRow(rowId: string): number {
        return this.byRow.get(rowId) ?? 0;
    }
    
    reset(): void {
        this.entries = [];
        this.totalUsed = 0;
        this.byProvider.clear();
        this.byRow.clear();
    }
    
    getEntries(): CostEntry[] {
        return [...this.entries];
    }
}

/**
 * Cost Governor class
 */
export class CostGovernor {
    private config: BudgetConfig;
    private store: CostStore;
    private disabledProviders: Set<string> = new Set();
    
    constructor(config?: Partial<BudgetConfig>) {
        this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
        this.store = new CostStore();
    }
    
    /**
     * Record a cost
     */
    recordCost(
        rowId: string,
        tableId: string,
        provider: string,
        field: string,
        costCents: number
    ): void {
        const entry: CostEntry = {
            id: `cost_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            rowId,
            tableId,
            provider,
            field,
            costCents,
            timestamp: new Date().toISOString(),
        };
        
        this.store.add(entry);
        
        logger.debug("💰 CostGovernor: Cost recorded", {
            provider,
            costCents,
            totalUsed: this.store.getTotalUsed(),
        });
        
        // Check if we should disable this provider
        this.checkProviderLimit(provider);
    }
    
    /**
     * Check if a provider should be disabled due to limits
     */
    private checkProviderLimit(provider: string): void {
        const providerLimit = this.config.providerLimits?.[provider];
        if (!providerLimit) return;
        
        const providerCosts = this.store.getByProvider();
        const providerUsed = providerCosts[provider] ?? 0;
        
        if (providerUsed >= providerLimit) {
            this.disabledProviders.add(provider);
            logger.warn("⚠️ CostGovernor: Provider disabled due to budget limit", {
                provider,
                used: providerUsed,
                limit: providerLimit,
            });
        }
    }
    
    /**
     * Check if we can afford a provider call
     */
    canAfford(provider: string, estimatedCostCents: number, rowId?: string): boolean {
        // Check if provider is disabled
        if (this.disabledProviders.has(provider)) {
            return false;
        }
        
        // Check total budget
        const remaining = this.config.totalCents - this.store.getTotalUsed();
        if (estimatedCostCents > remaining) {
            logger.warn("⚠️ CostGovernor: Insufficient budget", {
                provider,
                estimatedCost: estimatedCostCents,
                remaining,
            });
            return false;
        }
        
        // Check per-row limit
        if (rowId) {
            const rowUsed = this.store.getByRow(rowId);
            if (rowUsed + estimatedCostCents > this.config.perRowLimitCents) {
                logger.warn("⚠️ CostGovernor: Row budget exceeded", {
                    provider,
                    rowId,
                    rowUsed,
                    limit: this.config.perRowLimitCents,
                });
                return false;
            }
        }
        
        // Check provider-specific limit
        const providerLimit = this.config.providerLimits?.[provider];
        if (providerLimit) {
            const providerCosts = this.store.getByProvider();
            const providerUsed = providerCosts[provider] ?? 0;
            if (providerUsed + estimatedCostCents > providerLimit) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Get current budget status
     */
    getStatus(): BudgetStatus {
        const usedCents = this.store.getTotalUsed();
        const remainingCents = this.config.totalCents - usedCents;
        const percentUsed = usedCents / this.config.totalCents;
        
        return {
            totalBudgetCents: this.config.totalCents,
            usedCents,
            remainingCents,
            percentUsed: Math.round(percentUsed * 100) / 100,
            isWarning: percentUsed >= this.config.warningThreshold,
            isExhausted: remainingCents <= 0,
            breakdown: this.store.getByProvider(),
        };
    }
    
    /**
     * Get remaining budget for a specific provider
     */
    getRemainingForProvider(provider: string): number {
        const providerLimit = this.config.providerLimits?.[provider];
        if (!providerLimit) {
            // Use remaining total budget
            return this.config.totalCents - this.store.getTotalUsed();
        }
        
        const providerCosts = this.store.getByProvider();
        const providerUsed = providerCosts[provider] ?? 0;
        return providerLimit - providerUsed;
    }
    
    /**
     * Allocate budget for a row
     */
    allocateRowBudget(rowId: string): {
        totalCents: number;
        freeBudget: number;
        cheapBudget: number;
        premiumBudget: number;
    } {
        const rowUsed = this.store.getByRow(rowId);
        const remaining = Math.min(
            this.config.perRowLimitCents - rowUsed,
            this.config.totalCents - this.store.getTotalUsed()
        );
        
        return {
            totalCents: remaining,
            freeBudget: Infinity, // Free is always available
            cheapBudget: Math.floor(remaining * 0.4),
            premiumBudget: Math.floor(remaining * 0.6),
        };
    }
    
    /**
     * Get list of disabled providers
     */
    getDisabledProviders(): string[] {
        return [...this.disabledProviders];
    }
    
    /**
     * Re-enable a provider (e.g., after budget top-up)
     */
    enableProvider(provider: string): void {
        this.disabledProviders.delete(provider);
    }
    
    /**
     * Update budget configuration
     */
    updateConfig(config: Partial<BudgetConfig>): void {
        this.config = { ...this.config, ...config };
        
        // Re-check all provider limits
        for (const provider of Object.keys(this.store.getByProvider())) {
            this.checkProviderLimit(provider);
        }
    }
    
    /**
     * Reset cost tracking (e.g., for new billing period)
     */
    reset(): void {
        this.store.reset();
        this.disabledProviders.clear();
    }
    
    /**
     * Get all cost entries (for export/audit)
     */
    getEntries(): CostEntry[] {
        return this.store.getEntries();
    }
    
    /**
     * Filter providers by affordability
     */
    filterAffordableProviders<T extends { name: string; costCents: number }>(
        providers: T[],
        rowId?: string
    ): T[] {
        return providers.filter(p => this.canAfford(p.name, p.costCents, rowId));
    }
    
    /**
     * Sort providers by cost efficiency
     */
    sortByEfficiency<T extends { name: string; tier: ProviderTier; costCents: number }>(
        providers: T[]
    ): T[] {
        const tierOrder: ProviderTier[] = ['free', 'cheap', 'premium'];
        
        return [...providers].sort((a, b) => {
            // First by tier
            const tierDiff = tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
            if (tierDiff !== 0) return tierDiff;
            
            // Then by cost
            return a.costCents - b.costCents;
        });
    }
}

// Export singleton instance
export const costGovernor = new CostGovernor();

/**
 * Create a cost governor for a specific context (user/team)
 */
export function createCostGovernor(config?: Partial<BudgetConfig>): CostGovernor {
    return new CostGovernor(config);
}
