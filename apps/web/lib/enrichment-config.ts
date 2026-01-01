/**
 * Enrichment Configuration
 * 
 * This file contains configuration for enrichment functionality.
 * Update these settings to switch from simulation to real enrichment.
 */

export const enrichmentConfig = {
  /**
   * Mode: 'simulation' or 'production'
   * - simulation: Uses mock data with realistic delays (no API calls)
   * - production: Makes real API calls for enrichment
   */
  mode: 'simulation' as 'simulation' | 'production',

  /**
   * Enable/disable realistic delays in simulation mode
   */
  simulateDelay: true,

  /**
   * Default budget in cents for enrichment operations
   */
  defaultBudgetCents: 100, // $1.00

  /**
   * Auto-save enriched data to table
   * When true, enriched results will automatically update table cells
   */
  autoSaveResults: false,

  /**
   * Cache enrichment results
   */
  enableCache: true,

  /**
   * Cache TTL in days
   */
  cacheTTLDays: 7,

  /**
   * Service configuration
   */
  services: {
    /**
     * Search service (Serper, etc.)
     */
    search: {
      enabled: false,
      provider: 'serper',
      costPerQuery: 1, // cents
    },

    /**
     * ContactOut for email/phone lookup
     */
    contactOut: {
      enabled: false,
      costPerLookup: 50, // cents
    },

    /**
     * LinkedIn scraping
     */
    linkedin: {
      enabled: false,
      costPerScrape: 25, // cents
    },

    /**
     * Website scraping
     */
    websiteScrape: {
      enabled: false,
      costPerScrape: 10, // cents
    },
  },

  /**
   * Field mapping configuration
   * Maps enrichment fields to table columns
   */
  fieldMapping: {
    /**
     * Auto-detect column mappings based on column names
     */
    autoDetect: true,

    /**
     * Custom mappings: { enrichmentField: columnKey }
     */
    custom: {
      // Example:
      // 'company_name': 'company',
      // 'person_email': 'email',
    },
  },

  /**
   * UI Configuration
   */
  ui: {
    /**
     * Show simulation badge
     */
    showSimulationBadge: true,

    /**
     * Show cost estimates
     */
    showCostEstimates: true,

    /**
     * Show confidence scores
     */
    showConfidenceScores: true,

    /**
     * Enable field auto-selection based on column names
     */
    enableSmartFieldSelection: true,
  },

  /**
   * Advanced options
   */
  advanced: {
    /**
     * Maximum concurrent enrichment operations
     */
    maxConcurrentOperations: 5,

    /**
     * Retry failed enrichments
     */
    retryOnFailure: true,

    /**
     * Max retry attempts
     */
    maxRetries: 3,

    /**
     * Timeout for enrichment operations (ms)
     */
    timeout: 30000, // 30 seconds
  },
};

/**
 * Helper function to check if enrichment is in simulation mode
 */
export const isSimulationMode = () => enrichmentConfig.mode === 'simulation';

/**
 * Helper function to check if a service is enabled
 */
export const isServiceEnabled = (service: keyof typeof enrichmentConfig.services) => {
  return enrichmentConfig.services[service]?.enabled ?? false;
};

/**
 * Helper function to get enrichment cost for a service
 */
export const getServiceCost = (service: keyof typeof enrichmentConfig.services) => {
  const serviceConfig = enrichmentConfig.services[service];
  if ('costPerQuery' in serviceConfig) return serviceConfig.costPerQuery;
  if ('costPerLookup' in serviceConfig) return serviceConfig.costPerLookup;
  if ('costPerScrape' in serviceConfig) return serviceConfig.costPerScrape;
  return 0;
};

/**
 * Migration Guide to Production Mode:
 * 
 * 1. Set mode to 'production'
 * 2. Enable required services (search, contactOut, etc.)
 * 3. Configure API keys in environment variables:
 *    - SERPER_API_KEY
 *    - CONTACTOUT_API_KEY
 *    - etc.
 * 4. Set autoSaveResults to true if you want automatic updates
 * 5. Configure fieldMapping.custom for specific column mappings
 * 6. Test with small budget first (defaultBudgetCents)
 * 7. Monitor costs in enrichment results
 */

export default enrichmentConfig;
