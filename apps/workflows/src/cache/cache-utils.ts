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
// NOTE: These functions return ONLY the unique identifier (hash).
// The RedisCache class adds the prefix and version via buildKey().
// Do NOT add prefixes here to avoid double-prefixing.

/**
 * Build cache key for Serper search results
 * Returns only the hash - RedisCache adds the 'serper:v1:' prefix
 */
export function buildSerperCacheKey(query: string): string {
    return hashKey(query.toLowerCase().trim());
}

/**
 * Build cache key for LLM extraction results
 * Returns only the hash - RedisCache adds the 'llm:v1:' prefix
 */
export function buildLLMCacheKey(promptHash: string): string {
    return promptHash;
}

/**
 * Build cache key for page scrape results
 * Returns only the hash - RedisCache adds the 'scrape:v1:' prefix
 */
export function buildScrapeCacheKey(url: string): string {
    const normalized = normalizeDomainForCache(url);
    return hashKey(normalized);
}

/**
 * Build cache key for company profile
 * Returns normalized domain - caller adds prefix
 */
export function buildCompanyProfileCacheKey(domain: string): string {
    return `profile:${normalizeDomainForCache(domain)}`;
}

/**
 * Build cache key for company socials
 * Returns normalized domain - caller adds prefix
 */
export function buildCompanySocialsCacheKey(domain: string): string {
    return `socials:${normalizeDomainForCache(domain)}`;
}

/**
 * Build cache key for company size
 * Returns normalized domain - caller adds prefix
 */
export function buildCompanySizeCacheKey(domain: string): string {
    return `size:${normalizeDomainForCache(domain)}`;
}

/**
 * Build cache key for person LinkedIn resolution
 * Returns normalized LinkedIn slug
 */
export function buildPersonLinkedInCacheKey(linkedinUrl: string): string {
    return `linkedin:${normalizeLinkedInUrl(linkedinUrl)}`;
}

/**
 * Build cache key for LinkedIn profile search
 * Returns hash of name+company
 */
export function buildLinkedInSearchCacheKey(name: string, company?: string): string {
    const hash = hashParams(name, company);
    return `linkedin_search:${hash}`;
}

/**
 * Build cache key for generic web search
 * Returns hash of field+context
 */
export function buildGenericSearchCacheKey(targetField: string, context: Record<string, unknown>): string {
    const contextStr = Object.entries(context)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}:${v}`)
        .sort()
        .join('|');
    return `search:${hashParams(targetField, contextStr)}`;
}

/**
 * Build cache key for email verification
 * Returns hash of email
 */
export function buildEmailVerificationCacheKey(email: string): string {
    return `verify:${hashKey(email.toLowerCase().trim())}`;
}

/**
 * Build cache key for person public profile
 * Returns normalized LinkedIn slug
 */
export function buildPersonPublicProfileCacheKey(linkedinUrl: string): string {
    return `public:${normalizeLinkedInUrl(linkedinUrl)}`;
}

/**
 * Build cache key for work email guess
 * Returns hash of name+domain
 */
export function buildWorkEmailCacheKey(name: string, domain: string): string {
    return `work_email:${hashParams(name, domain)}`;
}
