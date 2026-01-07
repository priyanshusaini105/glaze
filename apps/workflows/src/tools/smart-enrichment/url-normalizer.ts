/**
 * URL Normalizer
 * 
 * Normalize website URLs for consistent storage.
 * 
 * Rules:
 * - Force https
 * - Remove www.
 * - Remove trailing slash
 * - Remove tracking parameters (utm_*, fbclid, etc.)
 */

// Query parameters to remove
const TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'fbclid', 'gclid', 'msclkid', 'ref', 'source', 'mc_eid'
];

/**
 * Normalize a website URL for storage
 */
export function normalizeUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    try {
        // Handle URLs without protocol
        let urlStr = url.trim();
        if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
            urlStr = `https://${urlStr}`;
        }

        const parsed = new URL(urlStr);

        // Force https and remove www.
        let hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
        let normalized = `https://${hostname}`;

        // Keep path but remove trailing slash (except for root)
        if (parsed.pathname && parsed.pathname !== '/') {
            normalized += parsed.pathname.replace(/\/$/, '');
        }

        // Remove tracking parameters
        if (parsed.search) {
            const params = new URLSearchParams(parsed.search);
            for (const param of TRACKING_PARAMS) {
                params.delete(param);
            }
            const cleanSearch = params.toString();
            if (cleanSearch) {
                normalized += `?${cleanSearch}`;
            }
        }

        return normalized;
    } catch {
        // Return as-is if parsing fails
        return url;
    }
}

/**
 * Extract domain from URL
 */
export function extractDomainFromUrl(url: string): string | null {
    try {
        const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
        return parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return null;
    }
}
