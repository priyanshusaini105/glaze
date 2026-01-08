/**
 * Enrichment Plans
 * 
 * Pre-defined enrichment plans for common use cases.
 * Plans are registered automatically when this module is imported.
 */

import { logger } from "@trigger.dev/sdk";

export interface EnrichmentPlan {
  /** Plan name/identifier */
  name: string;
  /** Plan description */
  description: string;
  /** Fields this plan enriches */
  fields: string[];
  /** Maximum cost in cents */
  maxCostCents: number;
  /** Provider tiers to use */
  tiers: string[];
}

/**
 * Standard enrichment plans
 */
export const plans: Record<string, EnrichmentPlan> = {
  basic: {
    name: "basic",
    description: "Basic free enrichment using public sources",
    fields: ["company", "domain", "website"],
    maxCostCents: 0,
    tiers: ["free"],
  },
  standard: {
    name: "standard",
    description: "Standard enrichment with cheap providers",
    fields: ["company", "domain", "website", "email", "phone"],
    maxCostCents: 50,
    tiers: ["free", "cheap"],
  },
  premium: {
    name: "premium",
    description: "Premium enrichment with all providers",
    fields: ["company", "domain", "website", "email", "phone", "linkedinUrl", "bio"],
    maxCostCents: 200,
    tiers: ["free", "cheap", "premium"],
  },
};

// Auto-register plans
logger.info("📋 Registered enrichment plans", {
  plans: Object.keys(plans),
});
