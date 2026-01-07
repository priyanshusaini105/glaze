/**
 * Default enrichment plan
 * 
 * Simple cost-optimized strategy that prefers free/cheap providers.
 */

import { definePlan } from '@/core/plan-registry';
import { getRegistry } from '@/core/registry';
import type { EnrichmentFieldKey, NormalizedInput } from '@/types/enrichment';

export const defaultPlan = definePlan({
  name: 'default',
  description: 'Cost-optimized enrichment using cheapest providers first',
  priority: 1, // Lowest priority (fallback)
  
  canHandle: () => true, // Can handle any input
  
  generateSteps: async (input, fields, budgetCents) => {
    const registry = getRegistry();
    const steps = [];

    for (const field of fields) {
      // Get providers for this field, sorted by cost
      const providers = registry.getByCost(field);
      
      if (providers.length === 0) {
        continue;
      }

      // Pick the cheapest compatible provider
      const compatibleProviders = providers.filter(p => {
        if (!p.requiredInputs) return true;
        return p.requiredInputs.some(req => input[req]);
      });

      if (compatibleProviders.length > 0) {
        const cheapest = compatibleProviders[0];
        if (cheapest) {
          steps.push({
            tool: cheapest.name,
            field,
            reason: `Cheapest provider for ${field}`,
          });
        }
      }
    }

    return steps;
  },
});
