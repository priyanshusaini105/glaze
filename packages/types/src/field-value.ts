/**
 * FieldValue<T> - The canonical data structure for all enriched fields
 * 
 * Every enrichment field must return this shape. No exceptions.
 * LLM outputs are never trusted without sources.
 */

/**
 * Core FieldValue type - the atomic unit of enriched data
 * 
 * @template T - The type of the value (string, number, string[], etc.)
 */
export interface FieldValue<T = unknown> {
    /** The enriched value, or null if not found */
    value: T | null;
    
    /** Confidence score from 0 to 1 */
    confidence: number;
    
    /** List of sources that contributed to this value */
    sources: string[];
    
    /** Whether the value has been verified (only applicable for emails) */
    verified?: boolean;
    
    /** Raw provider response for debugging/audit */
    raw?: unknown;
    
    /** ISO 8601 timestamp when this value was obtained */
    timestamp: string;
    
    /** Time-to-live in days before this value should be re-enriched */
    ttlDays: number;
    
    /** Label for LLM-generated content */
    label?: 'verified' | 'inferred' | 'generated';
}

/**
 * Email candidate with verification status
 */
export interface EmailCandidate {
    email: string;
    confidence: number;
    verified: boolean;
    pattern?: string; // e.g., "first.last@domain"
    sources: string[];
}

/**
 * Social link with platform identification
 */
export interface SocialLink {
    platform: 'linkedin' | 'twitter' | 'github' | 'facebook' | 'website' | 'other';
    url: string;
    verified: boolean;
}

/**
 * Entity identification result
 */
export interface EntityIdentity {
    entityType: 'person' | 'company' | 'unknown';
    canonicalName: string | null;
    canonicalCompany: string | null;
    domain: string | null;
    linkedinUrl: string | null;
    confidence: number;
}

/**
 * Provenance record for audit trail
 */
export interface ProvenanceRecord {
    id: string;
    rowId: string;
    tableId: string;
    field: string;
    source: string;
    value: unknown;
    confidence: number;
    rawResponse?: unknown;
    timestamp: string;
    costCents: number;
}

/**
 * Helper to create a FieldValue with defaults
 */
export function createFieldValue<T>(
    value: T | null,
    confidence: number,
    sources: string[],
    options?: Partial<Pick<FieldValue<T>, 'verified' | 'raw' | 'ttlDays' | 'label'>>
): FieldValue<T> {
    return {
        value,
        confidence: Math.max(0, Math.min(1, confidence)), // Clamp to 0-1
        sources,
        verified: options?.verified,
        raw: options?.raw,
        timestamp: new Date().toISOString(),
        ttlDays: options?.ttlDays ?? 30,
        label: options?.label,
    };
}

/**
 * Check if a FieldValue is stale based on TTL
 */
export function isFieldValueStale(fieldValue: FieldValue<unknown>): boolean {
    const expiresAt = new Date(fieldValue.timestamp);
    expiresAt.setDate(expiresAt.getDate() + fieldValue.ttlDays);
    return new Date() > expiresAt;
}

/**
 * Merge multiple FieldValues for the same field (consensus)
 */
export function mergeFieldValues<T>(
    values: FieldValue<T>[],
    pickBest: (values: FieldValue<T>[]) => T | null = (v) => v[0]?.value ?? null
): FieldValue<T> {
    if (values.length === 0) {
        return createFieldValue<T>(null, 0, []);
    }
    
    if (values.length === 1) {
        return values[0]!;
    }
    
    // Merge sources
    const allSources = [...new Set(values.flatMap(v => v.sources))];
    
    // Calculate consensus confidence (boost if multiple sources agree)
    const baseConfidence = Math.max(...values.map(v => v.confidence));
    const agreementBonus = values.length >= 2 ? 0.1 : 0;
    const mergedConfidence = Math.min(1, baseConfidence + agreementBonus);
    
    return createFieldValue(
        pickBest(values),
        mergedConfidence,
        allSources,
        {
            verified: values.some(v => v.verified),
            ttlDays: Math.min(...values.map(v => v.ttlDays)),
        }
    );
}

/**
 * Default TTL values by field type
 */
export const DEFAULT_TTL_DAYS: Record<string, number> = {
    name: 90,
    company: 60,
    title: 30,
    email: 14, // Emails change frequently
    emailCandidates: 14,
    phone: 30,
    location: 60,
    shortBio: 60,
    socialLinks: 30,
    companySize: 90,
    companySummary: 90,
    techStack: 60,
    funding: 30,
    foundedDate: 365, // Rarely changes
    whois: 30,
};

/**
 * Source trust weights for confidence calculation
 */
export const SOURCE_TRUST_WEIGHTS: Record<string, number> = {
    linkedin_api: 0.95,
    linkedin_parser: 0.85,
    github_api: 0.9,
    hunter_api: 0.9,
    zerobounce: 0.95,
    serper: 0.7,
    open_corporates: 0.9,
    company_scraper: 0.7,
    email_pattern: 0.3,
    llm_synthesis: 0.4,
    mock: 0.5,
};
