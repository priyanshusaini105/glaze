/**
 * Enrichment Pipeline Types
 * 
 * Shared types used across API, Worker, and Workflows
 */

import { z } from "zod";

// ===== Field Types =====

export type EnrichmentField =
  | "person_name"
  | "person_title"
  | "person_location"
  | "person_email"
  | "person_phone"
  | "company_name"
  | "company_domain"
  | "company_industry"
  | "company_size"
  | "company_revenue"
  | "company_employees"
  | "company_linkedin_url"
  | "company_website";

// ===== Enriched Value Type =====

export interface EnrichedValue {
  value: string | number | boolean;
  confidence: number; // 0-100
  source: string; // Provider name
  timestamp: string; // ISO 8601
  raw?: Record<string, unknown>; // Raw provider response
}

export interface EnrichmentData {
  [key: string]: EnrichedValue;
}

// ===== Job Input/Output =====

export const enrichmentJobInputSchema = z.object({
  url: z.string().url(),
  normalizedUrl: z.string(),
  type: z.enum(["company_website", "linkedin_profile", "company_linkedin"]),
  requiredFields: z.array(z.string()),
  skipCache: z.boolean().optional(),
  maxCostCents: z.number().optional(),
});

export type EnrichmentJobInput = z.infer<typeof enrichmentJobInputSchema>;

export interface EnrichmentJobResult {
  status: "pending" | "success" | "failed" | "partial";
  jobId: string;
  data: EnrichmentData;
  costs: {
    provider: number;
    llm: number;
    total: number;
  };
  stages: StageResult[];
  timestamp: string;
  error?: string;
}

// ===== Stage Results =====

export interface StageResult {
  name: string;
  status: "success" | "failed" | "skipped";
  fieldsFound: string[];
  timestamp: string;
  duration: number; // milliseconds
  cost?: number;
  error?: string;
}

// ===== Cost Tracking =====

export interface EnrichmentCost {
  provider: string;
  fieldCount: number;
  costCents: number;
  timestamp: string;
}

// ===== Cache Key =====

export const generateCacheKey = (url: string, fields: string[]): string => {
  return `enrichment:${url}:${fields.sort().join(",")}`;
};
