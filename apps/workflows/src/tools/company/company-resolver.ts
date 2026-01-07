/**
 * Company Resolver Tool
 * 
 * Resolves company information from a domain.
 * Provides canonical company data including name, domain, and website URL.
 * 
 * Input: domain
 * Output:
 * - companyName
 * - canonicalDomain
 * - websiteUrl
 * - status (valid | not_found)
 */

import { logger } from "@trigger.dev/sdk";
import { normalizeDomain, isFreeEmailDomain, getRootDomain } from "../domain-normalizer";

/**
 * Result of company resolution
 */
export interface CompanyResolutionResult {
    companyName: string | null;
    canonicalDomain: string | null;
    websiteUrl: string | null;
    status: "valid" | "not_found";
}

/**
 * Scraped company data from webpage
 */
interface ScrapedData {
    name?: string;
    description?: string;
    title?: string;
}

/**
 * Fetch a webpage with timeout and error handling
 */
async function fetchPage(url: string, timeoutMs: number = 10000): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; GlazeBot/1.0; +https://glaze.dev/bot)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            },
            redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) {
            logger.debug("🏢 CompanyResolver: Page fetch failed", {
                url,
                status: response.status,
            });
            return null;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
            logger.debug("🏢 CompanyResolver: Not HTML", { url, contentType });
            return null;
        }

        return await response.text();
    } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === "AbortError") {
            logger.debug("🏢 CompanyResolver: Timeout", { url });
        } else {
            logger.debug("🏢 CompanyResolver: Fetch error", {
                url,
                error: error instanceof Error ? error.message : "Unknown error",
            });
        }
        return null;
    }
}

/**
 * Extract meta tag content
 */
function extractMetaContent(html: string, name: string): string | null {
    // Try various meta tag formats
    const patterns = [
        new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${name}["']`, "i"),
        new RegExp(`<meta[^>]+property=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${name}["']`, "i"),
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match?.[1]) {
            return match[1].trim();
        }
    }

    return null;
}

/**
 * Extract title tag content
 */
function extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match?.[1]?.trim() ?? null;
}

/**
 * Scrape basic company data from HTML
 */
function scrapeCompanyData(html: string): ScrapedData {
    const data: ScrapedData = {};

    // Try various meta tags for company name
    data.name =
        extractMetaContent(html, "og:site_name") ??
        extractMetaContent(html, "application-name") ??
        extractMetaContent(html, "twitter:site") ??
        extractMetaContent(html, "twitter:creator") ??
        null;

    // Clean up Twitter handles
    if (data.name?.startsWith("@")) {
        data.name = data.name.substring(1);
    }

    // Get description
    data.description =
        extractMetaContent(html, "og:description") ??
        extractMetaContent(html, "description") ??
        extractMetaContent(html, "twitter:description") ??
        null;

    // Get title as fallback
    data.title = extractTitle(html);

    return data;
}

/**
 * Generate company name from domain if scraping fails
 */
function generateCompanyNameFromDomain(domain: string): string {
    // Remove TLD
    const withoutTld = domain.replace(/\.[a-z]{2,}$/i, "");
    
    // Split by dots, hyphens, underscores
    const parts = withoutTld.split(/[.\-_]/);
    
    // Capitalize each part
    const capitalized = parts.map(part => {
        if (part.length === 0) return "";
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    });
    
    return capitalized.join(" ");
}

/**
 * Resolve company information from a domain
 * 
 * @param domain - The domain to resolve (e.g., "example.com" or "https://example.com")
 * @returns Company resolution result with name, canonical domain, website URL, and status
 * 
 * @example
 * ```typescript
 * const result = await resolveCompanyFromDomain("stripe.com");
 * // {
 * //   companyName: "Stripe",
 * //   canonicalDomain: "stripe.com",
 * //   websiteUrl: "https://stripe.com",
 * //   status: "valid"
 * // }
 * ```
 */
export async function resolveCompanyFromDomain(
    domain: string
): Promise<CompanyResolutionResult> {
    try {
        // Normalize and validate the domain
        const normalized = normalizeDomain(domain);
        
        if (!normalized) {
            logger.debug("🏢 CompanyResolver: Invalid domain", { domain });
            return {
                companyName: null,
                canonicalDomain: null,
                websiteUrl: null,
                status: "not_found",
            };
        }

        // Check if it's a free email domain
        if (isFreeEmailDomain(normalized)) {
            logger.debug("🏢 CompanyResolver: Free email domain", { domain: normalized });
            return {
                companyName: null,
                canonicalDomain: null,
                websiteUrl: null,
                status: "not_found",
            };
        }

        // Get root domain
        const rootDomain = getRootDomain(normalized);
        const canonicalDomain = rootDomain || normalized;
        const websiteUrl = `https://${canonicalDomain}`;

        logger.info("🏢 CompanyResolver: Resolving company", { 
            originalDomain: domain,
            canonicalDomain,
        });

        // Try to fetch the company website
        const html = await fetchPage(websiteUrl);
        
        let companyName: string | null = null;

        if (html) {
            // Scrape company data
            const scraped = scrapeCompanyData(html);
            
            // Use scraped name or title, with some cleanup
            companyName = scraped.name || scraped.title || null;
            
            // Clean up common suffixes in titles
            if (companyName) {
                companyName = companyName
                    .replace(/\s*[-–|]\s*.+$/, "") // Remove " - tagline" or "| tagline"
                    .replace(/\s+Inc\.?$/i, "")    // Remove trailing "Inc"
                    .replace(/\s+LLC\.?$/i, "")    // Remove trailing "LLC"
                    .replace(/\s+Ltd\.?$/i, "")    // Remove trailing "Ltd"
                    .trim();
            }

            logger.info("🏢 CompanyResolver: Scraped company name", { 
                canonicalDomain,
                companyName,
            });
        }

        // If no name found from scraping, generate from domain
        if (!companyName) {
            companyName = generateCompanyNameFromDomain(canonicalDomain);
            logger.info("🏢 CompanyResolver: Generated company name from domain", { 
                canonicalDomain,
                companyName,
            });
        }

        return {
            companyName,
            canonicalDomain,
            websiteUrl,
            status: "valid",
        };

    } catch (error) {
        logger.error("🏢 CompanyResolver: Unexpected error", {
            domain,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        
        return {
            companyName: null,
            canonicalDomain: null,
            websiteUrl: null,
            status: "not_found",
        };
    }
}
