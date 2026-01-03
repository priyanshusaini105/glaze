import { z } from 'zod';

// ============ Field Definitions ============
export const ENRICHMENT_FIELDS = [
  // Company fields
  'company_name',
  'company_description',
  'company_website',
  'company_hq_location',
  'company_employee_count',
  'company_industry',
  'company_founded_year',
  'company_revenue',
  'company_funding',
  'company_linkedin',
  'company_twitter',
  'company_email',
  'company_phone',
  // Person fields
  'person_name',
  'person_email',
  'person_phone',
  'person_title',
  'person_linkedin',
  'person_location',
  'person_company'
] as const;

export type EnrichmentField = typeof ENRICHMENT_FIELDS[number];

// ============ Source & Confidence ============
export const ENRICHMENT_SOURCES = [
  'website_scrape',
  'linkedin_scrape',
  'linkedin_api',
  'search_result',
  'cache',
  'ai_inference'
] as const;

export type EnrichmentSource = typeof ENRICHMENT_SOURCES[number];

// Source ranking for confidence (higher = more trusted)
export const SOURCE_CONFIDENCE: Record<EnrichmentSource, number> = {
  linkedin_api: 95,        // New: Direct LinkedIn API
  website_scrape: 90,
  linkedin_scrape: 85,     // Scraping vs API
  cache: 85,
  search_result: 70,
  ai_inference: 40
};

export type EnrichedValue = {
  value: string | number | null;
  confidence: number; // 0-100
  source: EnrichmentSource;
  timestamp: string;
};

export type EnrichmentData = Partial<Record<EnrichmentField, EnrichedValue>>;

// ============ Input Schema ============
export const enrichmentInputTypeSchema = z.enum(['linkedin_profile', 'company_website', 'company_linkedin']);

// New: Support for different data structures
export const enrichmentDataTypeSchema = z.enum(['cell', 'array', 'column', 'row']);

export const enrichmentRequestSchema = z.object({
  // For backward compatibility, 'url' is still supported
  url: z.string().url().optional(),
  
  // New: Support different data types
  dataType: enrichmentDataTypeSchema.optional().default('cell'),
  
  // For cell: single value
  cellValue: z.string().optional(),
  
  // For array: list of values
  arrayValues: z.array(z.string()).optional(),
  
  // For column/row: ID reference
  columnId: z.string().optional(),
  rowId: z.string().optional(),
  
  inputType: enrichmentInputTypeSchema.optional(), // auto-detect if not provided
  requiredFields: z.array(z.enum(ENRICHMENT_FIELDS)).min(1, 'At least one field is required'),
  budgetCents: z.number().int().nonnegative().max(100_00).optional().default(0), // max $100
  mock: z.boolean().optional().default(true), // Default to simulation
  skipCache: z.boolean().optional().default(false),
  simulateDelay: z.boolean().optional().default(true) // Add realistic delays
}).refine(
  (data) => data.url || data.cellValue || data.arrayValues || data.columnId || data.rowId,
  { message: 'At least one of: url, cellValue, arrayValues, columnId, or rowId must be provided' }
);

export type EnrichmentRequest = z.infer<typeof enrichmentRequestSchema>;

export type EnrichmentJobInput = EnrichmentRequest & {
  requestedAt: string;
  normalizedUrl: string;
  detectedInputType: z.infer<typeof enrichmentInputTypeSchema>;
};

// ============ Result Schema ============
export type EnrichmentCost = {
  totalCents: number;
  breakdown: {
    source: EnrichmentSource;
    costCents: number;
    fieldsEnriched: string[];
  }[];
};

export type EnrichmentJobResult = {
  data: EnrichmentData;
  gaps: EnrichmentField[]; // fields that couldn't be enriched
  cost: EnrichmentCost;
  provenance: {
    field: EnrichmentField;
    source: EnrichmentSource;
    confidence: number;
  }[];
  notes: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  completedAt?: string;
  error?: string;
};

export type EnrichmentJobStatus = {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress?: number;
  result?: EnrichmentJobResult | null;
  attemptsMade: number;
  createdAt?: string;
};

// ============ Pipeline Stage Types ============
export type PipelineStage = 'free' | 'cheap' | 'premium' | 'paid';

export type StageResult = {
  stage: PipelineStage;
  source: EnrichmentSource;
  data: Partial<EnrichmentData>;
  costCents: number;
  durationMs: number;
  error?: string;
};

// ============ Cache Types ============
export type CachedEnrichment = {
  url: string;
  data: EnrichmentData;
  createdAt: string;
  expiresAt: string;
};

// ============ New Unified Enrichment Request/Response ============
export interface CellSelection {
  rowId: string;
  columnId: string;
}

export type EnrichTarget = 
  | { type: 'cells'; selections: CellSelection[] }
  | { type: 'rows'; rowIds: string[] }
  | { type: 'columns'; columnIds: string[] };

export interface EnrichRequest {
  tableId: string;
  targets: EnrichTarget[];
}

export interface EnrichResult {
  rowId: string;
  columnId: string;
  originalValue: any;
  enrichedValue: any;
  status: 'success' | 'error';
  error?: string;
}

export interface EnrichResponse {
  tableId: string;
  results: EnrichResult[];
  metadata: {
    processed: number;
    failed: number;
    cost?: number;
  };
}