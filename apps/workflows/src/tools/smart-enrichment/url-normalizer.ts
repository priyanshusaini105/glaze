/**
 * URL Normalizer
 * 
 * Normalize website URLs for consistent storage.
 * 
 * Rules:
 * - Force https
 * - Remove www.
 * - Strip path, query params, and hash (return only origin)
 * - Add trailing slash for consistency
 * 
 * Example: https://redditinc.com/press → https://redditinc.com/
 */

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
        
        // Return only the origin (protocol + hostname + trailing slash)
        // This ensures we always return https://domain.com/ instead of full paths
        return `https://${hostname}/`;
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
