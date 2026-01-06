/**
 * Entity Detection Service
 * 
 * Analyzes rows and columns to detect and group entities (companies/people).
 * This is the core optimization that enables entity-level enrichment instead
 * of cell-level enrichment.
 * 
 * Key features:
 * - Identifies entity type (company vs person)
 * - Groups cells by unique entity (deduplication)
 * - Finds best identifier for each entity
 * - Estimates enrichment cost
 */

// ===== Types =====

export interface RowData {
  id: string;
  data: Record<string, unknown> | unknown;
}

export interface ColumnData {
  id: string;
  key: string;
  label: string;
}

export interface EnrichmentEntity {
  entityId: string;
  type: "company" | "person" | "unknown";
  identifier: string;
  normalizedIdentifier: string;
  requestedFields: string[];
  targetCells: Array<{ rowId: string; columnKey: string }>;
  sourceData?: Record<string, unknown>;
}

export type EntityMap = Map<string, EnrichmentEntity>;

export interface DetectionResult {
  entityMap: EntityMap;
  stats: {
    totalCells: number;
    uniqueEntities: number;
    duplicatesFound: number;
    entitiesByType: {
      company: number;
      person: number;
      unknown: number;
    };
    cellsPerEntity: number;
  };
  warnings: string[];
}

export interface CostEstimate {
  totalCents: number;
  breakdown: Array<{
    source: string;
    count: number;
    costCents: number;
  }>;
}

// ===== Constants =====

// Column key patterns that indicate company data
const COMPANY_PATTERNS = [
  /company/i,
  /organization/i,
  /employer/i,
  /business/i,
  /corp/i,
  /firm/i,
];

// Column key patterns that indicate person data
const PERSON_PATTERNS = [
  /name/i,
  /person/i,
  /contact/i,
  /firstname/i,
  /lastname/i,
  /full.?name/i,
];

// Column key patterns that indicate identifier fields
const IDENTIFIER_PATTERNS = {
  linkedin: [/linkedin/i, /li.?url/i],
  email: [/email/i, /mail/i],
  domain: [/domain/i, /website/i, /url/i],
  name: [/name/i, /company/i],
};

// Provider costs in cents (estimates)
const PROVIDER_COSTS = {
  cache: 0,
  free: 0,
  cheap: 5,
  premium: 25,
};

// ===== Helper Functions =====

/**
 * Normalize an identifier for consistent deduplication
 */
export function normalizeIdentifier(value: string): string {
  let normalized = value.toLowerCase().trim();
  
  // Handle LinkedIn URLs - extract the key part
  if (normalized.includes("linkedin.com")) {
    const match = normalized.match(/linkedin\.com\/(?:in|company)\/([^\/\?]+)/i);
    if (match) {
      normalized = `linkedin:${match[1].toLowerCase()}`;
    }
  }
  
  // Handle email addresses
  if (normalized.includes("@")) {
    normalized = `email:${normalized.toLowerCase()}`;
  }
  
  // Handle domains
  if (normalized.match(/^https?:\/\//)) {
    try {
      const url = new URL(normalized);
      normalized = `domain:${url.hostname.replace(/^www\./, "")}`;
    } catch {
      // Not a valid URL, keep as is
    }
  }
  
  // Remove common suffixes
  normalized = normalized
    .replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\b\.?$/i, "")
    .replace(/[^\w\s@\-:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  
  return normalized;
}

/**
 * Detect entity type from column key and value
 */
export function detectEntityType(
  columnKey: string,
  value: unknown
): "company" | "person" | "unknown" {
  const strValue = String(value || "").toLowerCase();
  
  // Check LinkedIn URL for type hints
  if (strValue.includes("linkedin.com/company")) return "company";
  if (strValue.includes("linkedin.com/in")) return "person";
  
  // Check column key patterns
  for (const pattern of COMPANY_PATTERNS) {
    if (pattern.test(columnKey)) return "company";
  }
  
  for (const pattern of PERSON_PATTERNS) {
    if (pattern.test(columnKey)) return "person";
  }
  
  // Check value patterns
  if (strValue.includes("inc") || strValue.includes("llc") || strValue.includes("ltd")) {
    return "company";
  }
  
  return "unknown";
}

/**
 * Calculate a unique entity ID based on identifier
 */
export function calculateEntityId(
  type: "company" | "person" | "unknown",
  normalizedIdentifier: string
): string {
  // Simple hash for entity ID
  const hash = normalizedIdentifier
    .split("")
    .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);
  
  return `${type}_${Math.abs(hash).toString(36)}`;
}

/**
 * Find the best identifier from a row for an entity
 */
export function findBestIdentifier(
  rowData: Record<string, unknown>,
  columnKeys: string[]
): { key: string; value: string; type: "linkedin" | "email" | "domain" | "name" } | null {
  // Priority order for identifiers
  const priorities: Array<"linkedin" | "email" | "domain" | "name"> = [
    "linkedin",
    "email",
    "domain",
    "name",
  ];
  
  for (const idType of priorities) {
    const patterns = IDENTIFIER_PATTERNS[idType];
    
    for (const key of columnKeys) {
      for (const pattern of patterns) {
        if (pattern.test(key)) {
          const value = rowData[key];
          if (value && typeof value === "string" && value.trim()) {
            return { key, value: value.trim(), type: idType };
          }
        }
      }
    }
  }
  
  // Fallback: use first non-empty value
  for (const key of columnKeys) {
    const value = rowData[key];
    if (value && typeof value === "string" && value.trim()) {
      return { key, value: value.trim(), type: "name" };
    }
  }
  
  return null;
}

// ===== Main Functions =====

/**
 * Detect entities from rows and columns
 * 
 * This is the core function that groups cells by entity,
 * enabling the 10x+ efficiency improvement.
 */
export function detectEntities(
  rows: RowData[],
  columns: ColumnData[]
): DetectionResult {
  const entityMap: EntityMap = new Map();
  const warnings: string[] = [];
  let totalCells = 0;
  
  // Get all column keys
  const columnKeys = columns.map(c => c.key);
  
  for (const row of rows) {
    // Parse row data
    const rowData = typeof row.data === "object" && row.data !== null
      ? (row.data as Record<string, unknown>)
      : {};
    
    // Find best identifier for this row
    const identifier = findBestIdentifier(rowData, columnKeys);
    
    if (!identifier) {
      warnings.push(`Row ${row.id}: No identifier found`);
      continue;
    }
    
    // Normalize and create entity ID
    const normalizedId = normalizeIdentifier(identifier.value);
    const entityType = detectEntityType(identifier.key, identifier.value);
    const entityId = calculateEntityId(entityType, normalizedId);
    
    // Get or create entity
    let entity = entityMap.get(entityId);
    
    if (!entity) {
      entity = {
        entityId,
        type: entityType,
        identifier: identifier.value,
        normalizedIdentifier: normalizedId,
        requestedFields: [],
        targetCells: [],
        sourceData: {},
      };
      entityMap.set(entityId, entity);
    }
    
    // Add cells for this row
    for (const column of columns) {
      entity.targetCells.push({
        rowId: row.id,
        columnKey: column.key,
      });
      
      // Add requested field
      if (!entity.requestedFields.includes(column.key)) {
        entity.requestedFields.push(column.key);
      }
      
      totalCells++;
    }
    
    // Store source data from this row
    entity.sourceData = { ...entity.sourceData, ...rowData };
  }
  
  // Calculate stats
  const uniqueEntities = entityMap.size;
  const duplicatesFound = rows.length - uniqueEntities;
  
  const entitiesByType = {
    company: 0,
    person: 0,
    unknown: 0,
  };
  
  for (const entity of entityMap.values()) {
    entitiesByType[entity.type]++;
  }
  
  return {
    entityMap,
    stats: {
      totalCells,
      uniqueEntities,
      duplicatesFound,
      entitiesByType,
      cellsPerEntity: uniqueEntities > 0 ? totalCells / uniqueEntities : 0,
    },
    warnings,
  };
}

/**
 * Estimate enrichment cost for entities
 */
export function estimateEnrichmentCost(entityMap: EntityMap): CostEstimate {
  const breakdown: CostEstimate["breakdown"] = [];
  
  // Assume 20% cache hits, 30% free, 30% cheap, 20% premium
  const entityCount = entityMap.size;
  
  const cacheHits = Math.floor(entityCount * 0.2);
  const freeHits = Math.floor(entityCount * 0.3);
  const cheapHits = Math.floor(entityCount * 0.3);
  const premiumHits = entityCount - cacheHits - freeHits - cheapHits;
  
  if (cacheHits > 0) {
    breakdown.push({
      source: "cache",
      count: cacheHits,
      costCents: 0,
    });
  }
  
  if (freeHits > 0) {
    breakdown.push({
      source: "free (website scraping)",
      count: freeHits,
      costCents: 0,
    });
  }
  
  if (cheapHits > 0) {
    breakdown.push({
      source: "cheap (linkedin data API)",
      count: cheapHits,
      costCents: cheapHits * PROVIDER_COSTS.cheap,
    });
  }
  
  if (premiumHits > 0) {
    breakdown.push({
      source: "premium (apollo/clearbit)",
      count: premiumHits,
      costCents: premiumHits * PROVIDER_COSTS.premium,
    });
  }
  
  const totalCents = breakdown.reduce((sum, b) => sum + b.costCents, 0);
  
  return { totalCents, breakdown };
}

/**
 * Serialize entity map for transport (e.g., to Trigger.dev)
 */
export function serializeEntityMap(entityMap: EntityMap): EnrichmentEntity[] {
  return Array.from(entityMap.values());
}
