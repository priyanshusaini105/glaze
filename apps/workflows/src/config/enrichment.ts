/**
 * Enrichment Configuration
 * 
 * Centralized configuration for the enrichment system.
 */

export interface EnrichmentConfig {
  /** Use mock providers for testing */
  useMockProviders: boolean;
  /** Default budget in cents */
  defaultBudgetCents: number;
  /** Enable debug logging */
  debug: boolean;
  /** Rate limiting settings */
  rateLimiting: {
    enabled: boolean;
    requestsPerSecond: number;
  };
}

export const config: EnrichmentConfig = {
  useMockProviders: process.env.USE_MOCK_PROVIDERS === 'true',
  defaultBudgetCents: parseInt(process.env.DEFAULT_BUDGET_CENTS || '100', 10),
  debug: process.env.DEBUG === 'true',
  rateLimiting: {
    enabled: process.env.RATE_LIMITING_ENABLED !== 'false',
    requestsPerSecond: parseInt(process.env.RATE_LIMIT_RPS || '10', 10),
  },
};
