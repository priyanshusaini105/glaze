/**
 * LinkedIn-focused enrichment plan
 * 
 * Specialized plan for LinkedIn profile enrichment.
 * Higher priority when LinkedIn URL is available.
 */

import { definePlan } from '../core/plan-registry';
import type { EnrichmentFieldKey } from '../types/enrichment';

export const linkedinPlan = definePlan({
  name: 'linkedin-focused',
  description: 'Optimized for LinkedIn profile enrichment',
  priority: 10, // High priority when LinkedIn URL is available
  
  canHandle: (input) => !!input.linkedinUrl,
  
  generateSteps: async (input, fields, budgetCents) => {
    const steps = [];

    // LinkedIn provider can get most profile fields
    const linkedinFields = fields.filter(f => 
      ['name', 'title', 'company', 'location', 'shortBio', 'linkedinUrl'].includes(f)
    );

    if (linkedinFields.length > 0) {
      // Use LinkedIn provider for profile fields
      for (const field of linkedinFields) {
        steps.push({
          tool: 'linkedin',
          field,
          reason: 'Primary source: LinkedIn profile',
        });
      }
    }

    // For email, try GitHub first (free), then email inference
    if (fields.includes('email' as EnrichmentFieldKey)) {
      steps.push({
        tool: 'github',
        field: 'email' as EnrichmentFieldKey,
        reason: 'Free email lookup from GitHub',
      });
      steps.push({
        tool: 'email-pattern-inference',
        field: 'emailCandidates' as EnrichmentFieldKey,
        reason: 'Generate email candidates',
      });
    }

    // For company website, use domain from company name
    if (fields.includes('website' as EnrichmentFieldKey) && !steps.find(s => s.field === 'website')) {
      steps.push({
        tool: 'serper',
        field: 'website' as EnrichmentFieldKey,
        reason: 'Find company website',
      });
    }

    return steps;
  },

  estimateCost: (input, fields) => {
    // LinkedIn: 1 cent, GitHub: 0, Email inference: 0, Serper: 1 cent
    let cost = 0;
    if (fields.some(f => ['name', 'title', 'company'].includes(f))) cost += 1;
    if (fields.includes('website' as EnrichmentFieldKey)) cost += 1;
    return cost;
  },
});
