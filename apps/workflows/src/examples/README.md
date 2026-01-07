/**
 * Example: Adding a Custom Tool and Plan
 * 
 * This file demonstrates how to extend the enrichment system.
 * See docs/WORKFLOW_ARCHITECTURE.md for complete guide.
 */

// ============================================================
// EXAMPLE 1: Custom Provider
// ============================================================

import { defineProvider } from '../core/registry';

/**
 * Example: Custom Scraper Provider
 */
export const exampleScraperProvider = defineProvider({
  name: 'example-scraper',
  description: 'Example custom scraper',
  costMultiplier: 0.5,
  supportedFields: ['email', 'phone'],
  
  async execute(input, context) {
    // Your implementation here
    return {
      email: 'example@test.com',
      phone: '+1234567890',
    };
  },
});

// ============================================================
// EXAMPLE 2: Custom Plan
// ============================================================

import { definePlan } from '../core/plan-registry';

/**
 * Example: Custom Strategy
 */
export const examplePlan = definePlan({
  name: 'example-plan',
  description: 'Example custom strategy',
  priority: 3,
  
  canHandle: (input, fields) => {
    return !!input.linkedinUrl;
  },
  
  generateSteps: async (input, fields, budget) => {
    return [
      {
        tool: 'example-scraper',
        field: 'email' as any,
        reason: 'Example step',
      },
    ];
  },
});

/**
 * To use these:
 * 
 * 1. Move exampleScraperProvider to tools/providers/example-scraper.ts
 * 2. Add import './example-scraper'; to tools/providers/registry.ts
 * 3. Move examplePlan to plans/example.ts
 * 4. Add import './example'; to plans/index.ts
 * 
 * See docs/WORKFLOW_ARCHITECTURE.md for complete guide.
 */
