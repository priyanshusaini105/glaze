/**
 * Plan Registry System
 * 
 * Provides automatic plan/strategy discovery and registration.
 * Plans can be added by simply creating a new file in the plans directory.
 * 
 * @example Adding a new plan:
 * 
 * ```typescript
 * // Create file: plans/my-custom-plan.ts
 * import { definePlan } from '../core/plan-registry';
 * 
 * export const myCustomPlan = definePlan({
 *   name: 'my-custom-plan',
 *   description: 'My custom enrichment strategy',
 *   priority: 5,
 *   canHandle: (input, fields) => {
 *     return fields.includes('email');
 *   },
 *   generateSteps: async (input, fields, budget) => {
 *     return [
 *       { tool: 'github', field: 'email', reason: 'Check GitHub first' }
 *     ];
 *   }
 * });
 * ```
 */

import type { EnrichmentFieldKey, NormalizedInput } from '@/types/enrichment';

export interface PlanStep {
  /** Tool/provider name to use */
  tool: string;
  /** Field to enrich */
  field: EnrichmentFieldKey;
  /** Reason for using this tool */
  reason: string;
  /** Optional parallel execution group */
  parallelGroup?: number;
}

export interface PlanDefinition {
  /** Unique plan name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Priority (higher = more preferred) */
  priority: number;
  /** Check if this plan can handle the given input and fields */
  canHandle: (input: NormalizedInput, fields: EnrichmentFieldKey[]) => boolean;
  /** Generate execution steps */
  generateSteps: (
    input: NormalizedInput,
    fields: EnrichmentFieldKey[],
    budgetCents: number
  ) => Promise<PlanStep[]> | PlanStep[];
  /** Optional cost estimator */
  estimateCost?: (input: NormalizedInput, fields: EnrichmentFieldKey[]) => number;
}

class PlanRegistry {
  private plans: Map<string, PlanDefinition> = new Map();

  /**
   * Register a plan
   */
  register(plan: PlanDefinition): void {
    this.plans.set(plan.name, plan);
  }

  /**
   * Get plan by name
   */
  get(name: string): PlanDefinition | undefined {
    return this.plans.get(name);
  }

  /**
   * Get all plans
   */
  getAll(): PlanDefinition[] {
    return Array.from(this.plans.values());
  }

  /**
   * Get plans that can handle the given input, sorted by priority
   */
  getCompatible(input: NormalizedInput, fields: EnrichmentFieldKey[]): PlanDefinition[] {
    return this.getAll()
      .filter(plan => plan.canHandle(input, fields))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get the best plan for the given input
   */
  getBest(input: NormalizedInput, fields: EnrichmentFieldKey[]): PlanDefinition | undefined {
    const compatible = this.getCompatible(input, fields);
    return compatible[0];
  }

  /**
   * Clear all registered plans (useful for testing)
   */
  clear(): void {
    this.plans.clear();
  }
}

// Global registry instance
const planRegistry = new PlanRegistry();

/**
 * Helper function to define a plan
 */
export function definePlan(definition: PlanDefinition): PlanDefinition {
  planRegistry.register(definition);
  return definition;
}

/**
 * Get the global plan registry
 */
export function getPlanRegistry(): PlanRegistry {
  return planRegistry;
}

export default planRegistry;
