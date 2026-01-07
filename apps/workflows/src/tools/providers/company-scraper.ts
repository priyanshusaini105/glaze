/**
 * Company About Scraper Tool
 * 
 * Phase 2 deterministic enrichment tool.
 * Scrapes company information from domain homepages.
 * 
 * Extracts:
 * - company name
 * - description
 * - social links
 * 
 * Confidence: 0.7 for scraped data
 */

import { logger } from "@trigger.dev/sdk";
import { BaseProvider } from "../interfaces";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../../types/enrichment";
import { SOURCE_TRUST_WEIGHTS } from "@repo/types";
import { normalizeDomain } from "../domain-normalizer";

/**
 * Scraped company data
 */
interface ScrapedCompanyData {
    name?: string;
    description?: string;
    socialLinks?: string[];
    location?: string;
    foundedYear?: number;
}

/**
 * Common social media patterns to extract
 */
const SOCIAL_PATTERNS = [
    { pattern: /linkedin\.com\/(company|in)\/[a-zA-Z0-9\-_]+/gi, name: "linkedin" },
    { pattern: /twitter\.com\/[a-zA-Z0-9_]+/gi, name: "twitter" },
    { pattern: /x\.com\/[a-zA-Z0-9_]+/gi, name: "twitter" },
    { pattern: /github\.com\/[a-zA-Z0-9\-_]+/gi, name: "github" },
    { pattern: /facebook\.com\/[a-zA-Z0-9.\-_]+/gi, name: "facebook" },
    { pattern: /instagram\.com\/[a-zA-Z0-9._]+/gi, name: "instagram" },
    { pattern: /youtube\.com\/(c|channel|user)\/[a-zA-Z0-9\-_]+/gi, name: "youtube" },
];

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
            logger.debug("📄 CompanyScraper: Page fetch failed", {
                url,
                status: response.status,
            });
            return null;
        }

        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
            logger.debug("📄 CompanyScraper: Not HTML", { url, contentType });
            return null;
        }

        return await response.text();
    } catch (error) {
        clearTimeout(timeout);
        if (error instanceof Error && error.name === "AbortError") {
            logger.debug("📄 CompanyScraper: Timeout", { url });
        } else {
            logger.debug("📄 CompanyScraper: Fetch error", {
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
            return decodeHtmlEntities(match[1].trim());
        }
    }
    return null;
}

/**
 * Extract title from HTML
 */
function extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (match?.[1]) {
        // Clean up common patterns like "Company Name | Tagline"
        let title = decodeHtmlEntities(match[1].trim());
        title = title.split(/\s*[|\-–—]\s*/)[0]?.trim() ?? title;
        return title;
    }
    return null;
}

/**
 * Extract social links from HTML
 */
function extractSocialLinks(html: string): string[] {
    const links = new Set<string>();

    for (const { pattern } of SOCIAL_PATTERNS) {
        const matches = html.match(pattern);
        if (matches) {
            for (const match of matches) {
                // Normalize and dedupe
                let url = match.toLowerCase();
                if (!url.startsWith("http")) {
                    url = `https://${url}`;
                }
                links.add(url);
            }
        }
    }

    return Array.from(links);
}

/**
 * Decode HTML entities
 */
function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, "/")
        .replace(/&nbsp;/g, " ");
}

/**
 * Scrape company data from a domain
 */
async function scrapeCompanyData(domain: string): Promise<ScrapedCompanyData | null> {
    const urls = [
        `https://${domain}`,
        `https://www.${domain}`,
    ];

    for (const url of urls) {
        const html = await fetchPage(url);
        if (!html) continue;

        const data: ScrapedCompanyData = {};

        // Extract company name from various sources
        data.name =
            extractMetaContent(html, "og:site_name") ||
            extractMetaContent(html, "application-name") ||
            extractTitle(html) ||
            undefined;

        // Extract description
        data.description =
            extractMetaContent(html, "og:description") ||
            extractMetaContent(html, "description") ||
            extractMetaContent(html, "twitter:description") ||
            undefined;

        // Clean description
        if (data.description) {
            data.description = data.description.slice(0, 500).trim();
        }

        // Extract social links
        data.socialLinks = extractSocialLinks(html);

        // Check for structured data (JSON-LD)
        const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
        if (jsonLdMatch?.[1]) {
            try {
                const jsonLd = JSON.parse(jsonLdMatch[1]) as Record<string, unknown>;
                if (jsonLd["@type"] === "Organization" || jsonLd["@type"] === "Corporation") {
                    data.name = (jsonLd.name as string) || data.name;
                    data.description = (jsonLd.description as string) || data.description;
                    if (jsonLd.foundingDate) {
                        const year = parseInt(String(jsonLd.foundingDate).slice(0, 4), 10);
                        if (!isNaN(year) && year > 1800 && year <= new Date().getFullYear()) {
                            data.foundedYear = year;
                        }
                    }
                    const address = jsonLd.address as Record<string, string> | undefined;
                    if (address?.addressLocality) {
                        data.location = [
                            address.addressLocality,
                            address.addressRegion,
                            address.addressCountry,
                        ].filter(Boolean).join(", ");
                    }
                }
            } catch {
                // Invalid JSON-LD
            }
        }

        // Return if we found meaningful data
        if (data.name || data.description || (data.socialLinks && data.socialLinks.length > 0)) {
            return data;
        }
    }

    return null;
}

/**
 * Company About Scraper Provider
 */
export class CompanyScraperProvider extends BaseProvider {
    name = "company_scraper";
    tier = "free" as const;
    costCents = 0; // No API cost, just compute

    protected supportedFields: EnrichmentFieldKey[] = [
        "company",
        "companySummary",
        "socialLinks",
        "location",
        "foundedDate",
    ];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        if (!input.domain) {
            logger.debug("📄 CompanyScraperProvider: No domain provided", { rowId: input.rowId });
            return null;
        }

        const domain = normalizeDomain(input.domain);
        if (!domain) {
            logger.debug("📄 CompanyScraperProvider: Invalid domain", { rowId: input.rowId, domain: input.domain });
            return null;
        }

        logger.info("📄 CompanyScraperProvider: Scraping", {
            rowId: input.rowId,
            domain,
            field,
        });

        const data = await scrapeCompanyData(domain);
        if (!data) {
            logger.debug("📄 CompanyScraperProvider: No data found", { rowId: input.rowId, domain });
            return null;
        }

        let value: string | number | string[] | null = null;
        let confidence = SOURCE_TRUST_WEIGHTS.company_scraper ?? 0.7;

        switch (field) {
            case "company":
                value = data.name ?? null;
                confidence = data.name ? 0.7 : 0;
                break;

            case "companySummary":
                value = data.description ?? null;
                confidence = data.description ? 0.65 : 0;
                break;

            case "socialLinks":
                value = data.socialLinks && data.socialLinks.length > 0 ? data.socialLinks : null;
                confidence = data.socialLinks && data.socialLinks.length > 0 ? 0.8 : 0;
                break;

            case "location":
                value = data.location ?? null;
                confidence = data.location ? 0.6 : 0;
                break;

            case "foundedDate":
                value = data.foundedYear ?? null;
                confidence = data.foundedYear ? 0.75 : 0;
                break;
        }

        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }

        logger.info("✅ CompanyScraperProvider: Found data", {
            rowId: input.rowId,
            field,
            domain,
            confidence,
        });

        return this.createResult(field, value, confidence, {
            domain,
            scrapedAt: new Date().toISOString(),
        });
    }
}

// Export singleton instance
export const companyScraperProvider = new CompanyScraperProvider();
