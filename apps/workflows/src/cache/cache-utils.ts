/**
 * Cache Utility Functions
 * 
 * Helper functions for consistent cache key generation
 * and data normalization across all cached operations.
 */

import { createHash } from 'crypto';

// ============ Hash Functions ============

/**
 * Create a short MD5 hash of input for cache keys
 */
export function hashKey(input: string): string {
    return createHash('md5').update(input).digest('hex').slice(0, 16);
}

/**
 * Create a hash from multiple parameters
 */
export function hashParams(...params: (string | undefined | null)[]): string {
    const combined = params.filter(Boolean).join('|').toLowerCase();
    return hashKey(combined);
}

// ============ Domain Normalization ============

/**
 * Normalize domain for consistent cache keys.
 * Removes protocol, www, trailing slashes, and converts to lowercase.
 */
export function normalizeDomainForCache(domain: string): string {
    if (!domain) return '';

    return domain
        .toLowerCase()
        .trim()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/+$/, '')
        .replace(/[^a-z0-9.-]/g, ''); // Remove special chars
}

// ============ LinkedIn Normalization ============

/**
 * Extract canonical LinkedIn slug from various URL formats.
 * Returns just the username/slug portion.
 */
export function normalizeLinkedInUrl(url: string): string {
    if (!url) return '';

    const cleaned = url.toLowerCase().trim();

    // Extract slug from LinkedIn profile URL
    const patterns = [
        /linkedin\.com\/in\/([a-z0-9-]+)/i,
        /linkedin\.com\/company\/([a-z0-9-]+)/i,
        /linkedin\.com\/pub\/([a-z0-9-]+)/i,
    ];

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (match && match[1]) {
            return match[1].replace(/[^a-z0-9-]/g, '');
        }
    }

    // Fallback: hash the whole URL
    return hashKey(cleaned);
}

// ============ Cache Key Builders ============

/**
 * Build cache key for Serper search results
 */
export function buildSerperCacheKey(query: string): string {
    return `serper:v1:${hashKey(query.toLowerCase().trim())}`;
}

/**
 * Build cache key for LLM extraction results
 */
export function buildLLMCacheKey(promptHash: string): string {
    return `llm:v1:${promptHash}`;
}

/**
 * Build cache key for page scrape results
 */
export function buildScrapeCacheKey(url: string): string {
    const normalized = normalizeDomainForCache(url);
    return `scrape:v1:${hashKey(normalized)}`;
}

/**
 * Build cache key for company profile
 */
export function buildCompanyProfileCacheKey(domain: string): string {
    return `company:profile:${normalizeDomainForCache(domain)}`;
}

/**
 * Build cache key for company socials
 */
export function buildCompanySocialsCacheKey(domain: string): string {
    return `company:socials:${normalizeDomainForCache(domain)}`;
}

/**
 * Build cache key for company size
 */
export function buildCompanySizeCacheKey(domain: string): string {
    return `company:size:${normalizeDomainForCache(domain)}`;
}

/**
 * Build cache key for person LinkedIn resolution
 */
export function buildPersonLinkedInCacheKey(linkedinUrl: string): string {
    return `person:linkedin:${normalizeLinkedInUrl(linkedinUrl)}`;
}

/**
 * Build cache key for LinkedIn profile search
 */
export function buildLinkedInSearchCacheKey(name: string, company?: string): string {
    const hash = hashParams(name, company);
    return `person:linkedin_search:${hash}`;
}

/**
 * Build cache key for generic web search
 */
export function buildGenericSearchCacheKey(targetField: string, context: Record<string, unknown>): string {
    const contextStr = Object.entries(context)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}:${v}`)
        .sort()
        .join('|');
    return `generic:search:${hashParams(targetField, contextStr)}`;
}

/**
 * Build cache key for email verification
 */
export function buildEmailVerificationCacheKey(email: string): string {
    return `email:verify:${hashKey(email.toLowerCase().trim())}`;
}

/**
 * Build cache key for person public profile
 */
export function buildPersonPublicProfileCacheKey(linkedinUrl: string): string {
    return `person:public:${normalizeLinkedInUrl(linkedinUrl)}`;
}

/**
 * Build cache key for work email guess
 */
export function buildWorkEmailCacheKey(name: string, domain: string): string {
    return `person:work_email:${hashParams(name, domain)}`;
}
