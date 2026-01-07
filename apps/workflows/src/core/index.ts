/**
 * Core barrel export
 * 
 * Central export point for all core enrichment system components.
 */

// Re-export core functionality
export * from './registry';
export * from './plan-registry';
export * from './orchestrator';

// Re-export types for convenience
export type { EnrichmentFieldKey, NormalizedInput } from '../types/enrichment';
