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
  'search_result',
  'contactout',
  'cache',
  'ai_inference'
] as const;

export type EnrichmentSource = typeof ENRICHMENT_SOURCES[number];

// Source ranking for confidence (higher = more trusted)
export const SOURCE_CONFIDENCE: Record<EnrichmentSource, number> = {
  website_scrape: 95,
  linkedin_scrape: 90,
  cache: 85,
  search_result: 70,
  contactout: 80,
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

export const enrichmentRequestSchema = z.object({
  url: z.string().url(),
  inputType: enrichmentInputTypeSchema.optional(), // auto-detect if not provided
  requiredFields: z.array(z.enum(ENRICHMENT_FIELDS)).min(1, 'At least one field is required'),
  budgetCents: z.number().int().nonnegative().max(100_00).optional().default(0), // max $100
  mock: z.boolean().optional().default(false),
  skipCache: z.boolean().optional().default(false)
});

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
export type PipelineStage = 'free' | 'cheap' | 'paid';

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