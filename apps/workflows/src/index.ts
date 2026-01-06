// Re-export all workflow tasks from this file
export * from "./enrichment";
export * from "./cell-enrichment";
export * from "./entity-enrichment";
export * from "./hello-world";

/**
 * Trigger.dev workflows entry point
 * All tasks defined in this package are automatically discovered and registered
 * 
 * Available tasks:
 * - enrich-data: Legacy enrichment for URLs
 * - batch-enrich: Legacy batch enrichment
 * - process-enrichment-job: Orchestrates cell-level enrichment jobs (legacy)
 * - enrich-cell: Processes a single cell enrichment task (legacy)
 * - process-entity-enrichment: Optimized entity-based enrichment (production)
 * - hello-world: Simple test task for measuring Trigger.dev overhead
 */
