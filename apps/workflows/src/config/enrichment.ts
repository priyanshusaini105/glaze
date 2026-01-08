/**
 * Enrichment Configuration
 * 
 * Central configuration for enrichment system.
 */

export interface EnrichmentConfig {
  /** Confidence threshold for accepting results (0-1) */
  confidenceThreshold: number;
  
  /** Default budget in cents */
  defaultBudgetCents: number;
  
  /** Maximum cost per enrichment in cents */
  maxCostCents: number;
  
  /** Enable caching */
  enableCache: boolean;
  
  /** Cache TTL in seconds */
  cacheTTL: number;
  
  /** Maximum retries for failed enrichments */
  maxRetries: number;
  
  /** Timeout for enrichment operations in ms */
  timeoutMs: number;
  
  /** Enable mock providers for testing */
  useMockProviders: boolean;
}

export const config: EnrichmentConfig = {
  confidenceThreshold: 0.7,
  defaultBudgetCents: 100,
  maxCostCents: 500,
  enableCache: true,
  cacheTTL: 86400, // 24 hours
  maxRetries: 3,
  timeoutMs: 30000, // 30 seconds
  useMockProviders: process.env.USE_MOCK_PROVIDERS === 'true',
};
