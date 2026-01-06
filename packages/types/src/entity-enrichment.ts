/**
 * Entity-Based Enrichment Types
 * 
 * Production-optimized enrichment system that processes entities (companies/people)
 * instead of individual cells, enabling deduplication and batch processing.
 */

import { z } from "zod";

// ===== Entity Types =====

export const EntityType = {
  COMPANY: "company",
  PERSON: "person",
  UNKNOWN: "unknown",
} as const;

export type EntityTypeValue = (typeof EntityType)[keyof typeof EntityType];

// ===== Entity Detection =====

/**
 * Represents a unique entity to be enriched
 */
export interface EnrichmentEntity {
  /** Unique hash of the entity identifier */
  entityId: string;
  /** Type of entity (company or person) */
  type: EntityTypeValue;
  /** Primary identifier (URL, LinkedIn profile, email, domain) */
  identifier: string;
  /** Normalized identifier for matching */
  normalizedIdentifier: string;
  /** All fields requested for this entity */
  requestedFields: string[];
  /** All cells that need this entity's data */
  targetCells: EntityTargetCell[];
  /** Source row data for context */
  sourceData?: Record<string, unknown>;
}

export interface EntityTargetCell {
  rowId: string;
  columnKey: string;
}

/**
 * Entity map for batch processing
 */
export type EntityMap = Map<string, EnrichmentEntity>;

// ===== Optimized Job Types =====

export const OptimizedJobStatus = {
  PENDING: "pending",
  DETECTING: "detecting",     // Detecting entities
  ENRICHING: "enriching",     // Running enrichment
  DISTRIBUTING: "distributing", // Writing results
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type OptimizedJobStatusType = (typeof OptimizedJobStatus)[keyof typeof OptimizedJobStatus];

/**
 * Optimized enrichment job metadata stored in JSONB
 */
export interface OptimizedJobMetadata {
  /** Number of unique entities detected */
  entityCount: number;
  /** Number of total cells to update */
  cellCount: number;
  /** Entities grouped by type */
  entitiesByType: {
    company: number;
    person: number;
    unknown: number;
  };
  /** Cost breakdown */
  cost: {
    totalCents: number;
    breakdown: Array<{
      source: string;
      count: number;
      costCents: number;
    }>;
  };
  /** Processing stats */
  stats: {
    cacheHits: number;
    apiCalls: number;
    duplicatesAvoided: number;
    processingTimeMs: number;
  };
  /** Entity ID to enriched data map (for recovery/debugging) */
  entityResults?: Record<string, EnrichedEntityData>;
}

// ===== Enriched Data Types =====

export interface EnrichedFieldValue {
  value: string | number | boolean | null;
  confidence: number; // 0.0 - 1.0
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface EnrichedEntityData {
  entityId: string;
  type: EntityTypeValue;
  fields: Record<string, EnrichedFieldValue>;
  provenance: Array<{
    field: string;
    source: string;
    confidence: number;
  }>;
  costCents: number;
  processingTimeMs: number;
}

// ===== API Request/Response =====

/**
 * Optimized enrichment request
 */
export const optimizedEnrichRequestSchema = z.object({
  /** Table ID */
  tableId: z.string().min(1),
  /** Columns to enrich */
  columnIds: z.array(z.string()).min(1),
  /** Rows to enrich (if empty, enrich all rows) */
  rowIds: z.array(z.string()).optional(),
  /** Budget in cents (optional) */
  budgetCents: z.number().int().nonnegative().max(100_00).optional(),
  /** Skip cache (for testing) */
  skipCache: z.boolean().optional().default(false),
  /** Priority (0-10, higher = more priority) */
  priority: z.number().int().min(0).max(10).optional().default(5),
});

export type OptimizedEnrichRequest = z.infer<typeof optimizedEnrichRequestSchema>;

export interface OptimizedEnrichResponse {
  /** Job ID for tracking */
  jobId: string;
  /** Table being enriched */
  tableId: string;
  /** Current status */
  status: OptimizedJobStatusType;
  /** Number of unique entities detected */
  entityCount: number;
  /** Total cells to be updated */
  cellCount: number;
  /** Estimated cost in cents */
  estimatedCostCents: number;
  /** Message */
  message: string;
  /** Trigger.dev run ID for realtime subscription */
  runId?: string;
  /** Public access token for frontend */
  publicAccessToken?: string;
}

// ===== Trigger.dev Workflow Payloads =====

export interface EntityEnrichmentPayload {
  jobId: string;
  tableId: string;
  /** Serialized entity map (JSON) */
  entities: SerializedEntity[];
  /** Budget per entity in cents */
  budgetPerEntityCents: number;
  /** Skip cache flag */
  skipCache: boolean;
}

/**
 * Serialized entity for JSON transport
 */
export interface SerializedEntity {
  entityId: string;
  type: EntityTypeValue;
  identifier: string;
  normalizedIdentifier: string;
  requestedFields: string[];
  targetCells: EntityTargetCell[];
  sourceData?: Record<string, unknown>;
}

export interface EntityEnrichmentResult {
  jobId: string;
  status: "completed" | "failed" | "partial";
  /** Successfully enriched entities */
  successCount: number;
  /** Failed entities */
  failCount: number;
  /** Total cells updated */
  cellsUpdated: number;
  /** Total cost */
  totalCostCents: number;
  /** Processing time */
  processingTimeMs: number;
  /** Errors (if any) */
  errors?: Array<{
    entityId: string;
    error: string;
  }>;
}

// ===== Batch Processing Types =====

export interface BatchEnrichmentContext {
  jobId: string;
  tableId: string;
  entities: EnrichmentEntity[];
  budgetCents: number;
  skipCache: boolean;
  /** Accumulated results */
  results: Map<string, EnrichedEntityData>;
  /** Running cost */
  totalCostCents: number;
  /** Notes/logs */
  notes: string[];
}

export interface BatchCacheResult {
  /** Entities found in cache */
  hits: Map<string, EnrichedEntityData>;
  /** Entities not in cache */
  misses: EnrichmentEntity[];
  /** Cache stats */
  stats: {
    hitCount: number;
    missCount: number;
    hitRate: number;
  };
}

// ===== Row Update Types =====

export interface RowUpdateBatch {
  rowId: string;
  /** Fields to update in the data JSONB */
  updates: Record<string, unknown>;
  /** Metadata to merge (confidence, sources) */
  metadata: Record<string, EnrichedFieldValue>;
}

// ===== Realtime Progress Types =====

export interface EntityEnrichmentProgress {
  jobId: string;
  status: OptimizedJobStatusType;
  /** Entities processed so far */
  entitiesProcessed: number;
  /** Total entities */
  totalEntities: number;
  /** Current entity being processed */
  currentEntity?: string;
  /** Rows updated so far */
  rowsUpdated: number;
  /** Total rows */
  totalRows: number;
  /** Cost so far */
  costCents: number;
  /** Estimated time remaining (ms) */
  estimatedTimeRemainingMs?: number;
}

// ===== Helper Functions =====

/**
 * Calculate entity ID from identifier
 */
export function calculateEntityId(type: EntityTypeValue, identifier: string): string {
  const normalized = normalizeIdentifier(identifier);
  // Simple hash - in production use crypto.createHash('sha256')
  return `${type}:${normalized}`.toLowerCase().replace(/[^a-z0-9:]/g, '_');
}

/**
 * Normalize identifier for matching
 */
export function normalizeIdentifier(identifier: string): string {
  let normalized = identifier.toLowerCase().trim();
  
  // Remove protocol
  normalized = normalized.replace(/^https?:\/\//, '');
  
  // Remove www
  normalized = normalized.replace(/^www\./, '');
  
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  
  // Remove LinkedIn URL paths for profiles/companies
  if (normalized.includes('linkedin.com/in/')) {
    const match = normalized.match(/linkedin\.com\/in\/([^/?]+)/);
    if (match) normalized = `linkedin:${match[1]}`;
  } else if (normalized.includes('linkedin.com/company/')) {
    const match = normalized.match(/linkedin\.com\/company\/([^/?]+)/);
    if (match) normalized = `linkedin:company:${match[1]}`;
  }
  
  return normalized;
}

/**
 * Detect entity type from identifier
 */
export function detectEntityType(identifier: string): EntityTypeValue {
  const lower = identifier.toLowerCase();
  
  // LinkedIn profile = person
  if (lower.includes('linkedin.com/in/')) {
    return EntityType.PERSON;
  }
  
  // LinkedIn company = company
  if (lower.includes('linkedin.com/company/')) {
    return EntityType.COMPANY;
  }
  
  // Email with common personal domains = person
  if (lower.includes('@gmail.') || lower.includes('@yahoo.') || lower.includes('@hotmail.')) {
    return EntityType.PERSON;
  }
  
  // Business email = company
  if (lower.includes('@') && !lower.includes('@gmail.')) {
    return EntityType.COMPANY;
  }
  
  // URL without linkedin = company
  if (lower.includes('.com') || lower.includes('.io') || lower.includes('.org')) {
    return EntityType.COMPANY;
  }
  
  return EntityType.UNKNOWN;
}

/**
 * Serialize entity map for JSON transport
 */
export function serializeEntityMap(entityMap: EntityMap): SerializedEntity[] {
  return Array.from(entityMap.values()).map(entity => ({
    entityId: entity.entityId,
    type: entity.type,
    identifier: entity.identifier,
    normalizedIdentifier: entity.normalizedIdentifier,
    requestedFields: entity.requestedFields,
    targetCells: entity.targetCells,
    sourceData: entity.sourceData,
  }));
}

/**
 * Deserialize entities from JSON
 */
export function deserializeEntities(serialized: SerializedEntity[]): EnrichmentEntity[] {
  return serialized.map(s => ({
    ...s,
  }));
}
