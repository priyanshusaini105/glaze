/**
 * Domain Normalizer Tool
 * 
 * Normalizes company domains to a canonical form.
 * Handles:
 * - URL extraction
 * - Subdomain removal (optional)
 * - Common domain variations
 * - Redirect following (optional)
 */

import { logger } from "@trigger.dev/sdk";

/**
 * Common subdomains to strip for normalization
 */
const SUBDOMAINS_TO_STRIP = new Set([
    'www',
    'www2',
    'www3',
    'mail',
    'email',
    'webmail',
    'blog',
    'shop',
    'store',
    'app',
    'api',
    'cdn',
    'static',
    'assets',
    'img',
    'images',
    'docs',
    'support',
    'help',
]);

/**
 * Generic TLDs that shouldn't be stripped (for multi-part TLDs)
 */
const MULTI_PART_TLDS = new Set([
    'co.uk',
    'co.jp',
    'co.nz',
    'co.au',
    'co.in',
    'com.au',
    'com.br',
    'com.mx',
    'com.sg',
    'com.hk',
    'org.uk',
    'net.au',
    'ac.uk',
    'gov.uk',
]);

/**
 * Free email domains that shouldn't be used for company identification
 */
const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com',
    'googlemail.com',
    'yahoo.com',
    'yahoo.co.uk',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'msn.com',
    'aol.com',
    'icloud.com',
    'me.com',
    'mac.com',
    'protonmail.com',
    'proton.me',
    'mail.com',
    'zoho.com',
    'yandex.com',
    'qq.com',
    '163.com',
    '126.com',
]);

/**
 * Normalize a domain to its canonical form
 * 
 * @param input - Domain, URL, or email to normalize
 * @param options - Normalization options
 * @returns Normalized domain or null if invalid
 */
export function normalizeDomain(
    input: string,
    options: {
        stripSubdomain?: boolean;
        stripPath?: boolean;
        lowercase?: boolean;
    } = {}
): string | null {
    const {
        stripSubdomain = true,
        stripPath = true,
        lowercase = true,
    } = options;
    
    if (!input || typeof input !== 'string') {
        return null;
    }
    
    let domain = input.trim();
    
    // Handle URLs
    if (domain.includes('://')) {
        try {
            const url = new URL(domain);
            domain = url.hostname;
        } catch {
            // Not a valid URL, try to extract domain anyway
            const match = domain.match(/:\/\/([^\/\?#]+)/);
            if (match) {
                domain = match[1]!;
            }
        }
    }
    
    // Handle email addresses
    if (domain.includes('@')) {
        const parts = domain.split('@');
        domain = parts[parts.length - 1]!;
    }
    
    // Remove port if present
    domain = domain.replace(/:\d+$/, '');
    
    // Remove trailing slashes and paths
    if (stripPath) {
        domain = domain.split('/')[0]!;
    }
    
    // Lowercase
    if (lowercase) {
        domain = domain.toLowerCase();
    }
    
    // Strip subdomain if requested
    if (stripSubdomain) {
        domain = stripSubdomainFromDomain(domain);
    }
    
    // Validate the result
    if (!isValidDomain(domain)) {
        return null;
    }
    
    return domain;
}

/**
 * Strip common subdomains from a domain
 */
function stripSubdomainFromDomain(domain: string): string {
    const parts = domain.split('.');
    
    if (parts.length <= 2) {
        return domain;
    }
    
    // Check for multi-part TLD
    const lastTwo = parts.slice(-2).join('.');
    const isMultiPartTld = MULTI_PART_TLDS.has(lastTwo);
    
    if (isMultiPartTld && parts.length === 3) {
        return domain;
    }
    
    // Strip known subdomains
    const subdomain = parts[0]!.toLowerCase();
    if (SUBDOMAINS_TO_STRIP.has(subdomain)) {
        return parts.slice(1).join('.');
    }
    
    // For longer domains, be more aggressive
    if (parts.length > 3) {
        const minParts = isMultiPartTld ? 3 : 2;
        while (parts.length > minParts) {
            const first = parts[0]!.toLowerCase();
            if (SUBDOMAINS_TO_STRIP.has(first) || /^(www\d*|m|mobile)$/.test(first)) {
                parts.shift();
            } else {
                break;
            }
        }
        return parts.join('.');
    }
    
    return domain;
}

/**
 * Validate a domain string
 */
function isValidDomain(domain: string): boolean {
    if (!domain || domain.length < 3) {
        return false;
    }
    
    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}

/**
 * Extract domain from an email address
 */
export function extractDomainFromEmail(email: string): string | null {
    if (!email || !email.includes('@')) {
        return null;
    }
    
    const parts = email.split('@');
    const domain = parts[parts.length - 1]!.toLowerCase();
    
    // Don't return free email domains as company domains
    if (FREE_EMAIL_DOMAINS.has(domain)) {
        logger.debug("📧 DomainNormalizer: Free email domain detected", { email, domain });
        return null;
    }
    
    return normalizeDomain(domain);
}

/**
 * Extract domain from a URL
 */
export function extractDomainFromUrl(url: string): string | null {
    return normalizeDomain(url);
}

/**
 * Check if a domain is a free email provider
 */
export function isFreeEmailDomain(domain: string): boolean {
    const normalized = normalizeDomain(domain, { stripSubdomain: false });
    return normalized ? FREE_EMAIL_DOMAINS.has(normalized) : false;
}

/**
 * Get the root domain (remove all subdomains)
 */
export function getRootDomain(domain: string): string | null {
    const normalized = normalizeDomain(domain, { stripSubdomain: false });
    if (!normalized) return null;
    
    const parts = normalized.split('.');
    const lastTwo = parts.slice(-2).join('.');
    
    if (MULTI_PART_TLDS.has(lastTwo) && parts.length >= 3) {
        return parts.slice(-3).join('.');
    }
    
    return parts.slice(-2).join('.');
}

/**
 * Compare two domains for equality (ignoring subdomains)
 */
export function domainsMatch(domain1: string, domain2: string): boolean {
    const normalized1 = getRootDomain(domain1);
    const normalized2 = getRootDomain(domain2);
    
    if (!normalized1 || !normalized2) {
        return false;
    }
    
    return normalized1 === normalized2;
}

/**
 * Batch normalize domains
 */
export function normalizeDomainsArray(domains: string[]): string[] {
    return domains
        .map(d => normalizeDomain(d))
        .filter((d): d is string => d !== null);
}
