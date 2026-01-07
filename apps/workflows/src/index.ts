/**
 * Trigger.dev workflows entry point
 * 
 * New architecture:
 * - Core system (registry, orchestrator, plans) in /core
 * - Tools automatically registered via /tools/providers
 * - Plans automatically registered via /plans
 * - Unified task interface via /tasks
 * 
 * Available tasks:
 * - enrich: New unified enrichment task (RECOMMENDED)
 * - process-enrichment-job: Cell-level enrichment orchestration (production)
 * - enrich-cell: Single cell enrichment (production)
 * - process-entity-enrichment: Entity-based enrichment (production)
 * - hello-world: Test task for overhead measurement
 * 
 * Legacy tasks (deprecated):
 * - enrich-data: Old URL enrichment
 * - batch-enrich: Old batch enrichment
 * - simple-enrichment: Old simple enrichment
 * - agentic-enrichment: Old agentic enrichment
 * - multi-agent-enrichment: Old multi-agent enrichment
 */

// Production tasks (actively used)
export * from "./cell-enrichment";
export * from "./entity-enrichment";
export * from "./hello-world";

// New unified task (RECOMMENDED for new integrations)
export * from "./tasks/enrich";

// Legacy tasks (kept for backward compatibility)
export * from "./enrichment";
export * from "./workflows/multi-agent-enrichment";
