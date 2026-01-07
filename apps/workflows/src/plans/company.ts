/**
 * Company enrichment plan
 * 
 * Specialized plan for company/domain enrichment.
 */

import { definePlan } from '@/core/plan-registry';
import type { EnrichmentFieldKey } from '@/types/enrichment';

export const companyPlan = definePlan({
  name: 'company-focused',
  description: 'Optimized for company domain enrichment',
  priority: 8, // High priority when domain is available
  
  canHandle: (input) => !!(input.domain || (input as any).website),
  
  generateSteps: async (input, fields, budgetCents) => {
    const steps = [];

    // Company scraper can get website info
    if (fields.some(f => ['company', 'description', 'industry', 'size'].includes(f))) {
      steps.push({
        tool: 'company-scraper',
        field: 'company' as EnrichmentFieldKey,
        reason: 'Scrape company website',
      });
    }

    // OpenCorporates for official company data
    if (fields.includes('company' as EnrichmentFieldKey)) {
      steps.push({
        tool: 'opencorporates',
        field: 'company' as EnrichmentFieldKey,
        reason: 'Official company registry data',
      });
    }

    // Wikipedia for well-known companies
    if (fields.some(f => ['description', 'industry'].includes(f))) {
      steps.push({
        tool: 'wikipedia',
        field: 'description' as EnrichmentFieldKey,
        reason: 'Company background from Wikipedia',
      });
    }

    return steps;
  },

  estimateCost: (input, fields) => {
    // Company scraper: 0.5, OpenCorporates: 0.5, Wikipedia: 0
    return 1;
  },
});
