/**
 * ResolvePersonFromLinkedIn Tool (MVP v0)
 * 
 * Snippet-first person resolution using Google search.
 * 
 * STRATEGY:
 * 1. Google search (mandatory) - collect titles + snippets
 * 2. Snippet-based extraction FIRST (80% of value)
 * 3. Check completeness threshold (≥3 fields = done)
 * 4. If needed: select best non-LinkedIn page to scrape
 * 5. Scrape single page for missing fields
 * 6. Confidence scoring (honest, capped)
 * 
 * RULES:
 * - Google snippets are pre-validated summaries
 * - LinkedIn is NEVER scraped
 * - LLM does lightweight extraction, not world modeling
 * - Partial results with honest confidence > fake completeness
 * - Success rate > accuracy, but identity mixing is forbidden
 */

import { logger } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import * as cheerio from "cheerio";
import {
    cachedSerperSearch,
    cachedPageScrape,
    withCache,
    CACHE_TTL,
    buildPersonLinkedInCacheKey,
    buildLinkedInSearchCacheKey,
    hashParams
} from "@/cache";

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// TYPES
// ============================================================

export interface PersonProfile {
    name: string | null;
    title: string | null;
    company: string | null;
    location: string | null;
    linkedinUrl: string | null;
    confidence: number;
    source: "snippets" | "snippets+scrape" | "failed";
    fieldsFromSnippets: string[];
    fieldsFromScrape: string[];
}

interface SearchResult {
    title: string;
    snippet: string;
    url: string;
    position: number;
}

// ============================================================
// STEP 1: GOOGLE SEARCH (MANDATORY)
// ============================================================

/**
 * Raw Serper search (internal)
 */
async function rawSerperSearch(query: string): Promise<SearchResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        logger.warn("⚠️ ResolvePersonFromLinkedIn: SERPER_API_KEY not configured");
        return [];
    }

    try {
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: query,
                num: 10,
            }),
        });

        if (!response.ok) {
            logger.error("❌ Serper API error", { status: response.status });
            return [];
        }

        const data = await response.json();
        const results: SearchResult[] = [];

        if (data.organic) {
            for (const item of data.organic) {
                results.push({
                    title: item.title || "",
                    snippet: item.snippet || "",
                    url: item.link || "",
                    position: item.position || results.length + 1,
                });
            }
        }

        return results.slice(0, 10);
    } catch (error) {
        logger.error("❌ Serper search failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return [];
    }
}

/**
 * Cached Serper search (24-hour cache)
 */
async function serperSearch(query: string): Promise<SearchResult[]> {
    const result = await cachedSerperSearch(query, async (q) => {
        const results = await rawSerperSearch(q);
        return { organic: results.map(r => ({ ...r, link: r.url })) };
    });

    return result.organic.map(r => ({
        title: r.title || '',
        snippet: r.snippet || '',
        url: r.link || '',
        position: r.position || 0,
    }));
}

/**
 * Extract LinkedIn slug from URL
 */
function extractLinkedInSlug(url: string): string | null {
    const match = url.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/);
    return match ? match[1] || null : null;
}

/**
 * Build search query based on available inputs
 */
function buildSearchQuery(
    linkedinUrl?: string,
    name?: string,
    company?: string
): string {
    if (linkedinUrl) {
        const slug = extractLinkedInSlug(linkedinUrl);
        if (slug) {
            return `site:linkedin.com/in "${slug}"`;
        }
        return `"${linkedinUrl}"`;
    }

    if (name && company) {
        return `"${name}" "${company}" LinkedIn`;
    }

    if (name) {
        return `"${name}" LinkedIn profile`;
    }

    return "";
}

// ============================================================
// STEP 2: SNIPPET-BASED EXTRACTION (THE KEY)
// ============================================================

const SnippetExtractionSchema = z.object({
    name: z.string().nullable().describe("Person's full name"),
    title: z.string().nullable().describe("Job title/role"),
    company: z.string().nullable().describe("Current company name"),
    location: z.string().nullable().describe("Location (city, country)"),
    linkedinUrl: z.string().nullable().describe("LinkedIn profile URL if found"),
    confidence: z.number().min(0).max(1).describe("Confidence in extracted data"),
});

type SnippetExtraction = z.infer<typeof SnippetExtractionSchema>;

/**
 * Extract person info from search snippets only
 * This is the PRIMARY extraction method - works surprisingly well
 */
async function extractFromSnippets(
    searchResults: SearchResult[],
    searchName?: string,
    searchCompany?: string
): Promise<SnippetExtraction | null> {
    if (searchResults.length === 0) {
        return null;
    }

    // Build context from titles and snippets
    const snippetContext = searchResults
        .slice(0, 5)
        .map((r, i) => `[${i + 1}] Title: ${r.title}\n    Snippet: ${r.snippet}\n    URL: ${r.url}`)
        .join("\n\n");

    const systemPrompt = `You are extracting person information from Google search result titles and snippets.

RULES - VERY IMPORTANT:
1. Extract ONLY information explicitly stated in the titles and snippets
2. Do NOT use outside knowledge
3. If a field is not clearly stated, return null
4. Google snippets often summarize LinkedIn bios - trust them
5. Look for patterns like "Name, Title at Company, Location"
6. If multiple people appear, focus on the one matching the search intent

Example snippet: "Guillaume Moubeche, Founder & CEO at Lemlist, Paris, France"
→ name: "Guillaume Moubeche", title: "Founder & CEO", company: "Lemlist", location: "Paris, France"`;

    const userPrompt = `Extract person information from these Google search results.
${searchName ? `Search was for: "${searchName}"${searchCompany ? ` at "${searchCompany}"` : ""}` : ""}

Search Results:
${snippetContext}

Extract: name, title, company, location, linkedinUrl`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: SnippetExtractionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        logger.info("✅ ResolvePersonFromLinkedIn: Snippet extraction complete", {
            name: result.object.name,
            title: result.object.title,
            company: result.object.company,
            location: result.object.location,
            confidence: result.object.confidence,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ ResolvePersonFromLinkedIn: Snippet extraction failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// STEP 3: CHECK COMPLETENESS THRESHOLD
// ============================================================

/**
 * Count filled (non-null) fields
 */
function countFilledFields(extraction: SnippetExtraction | null): number {
    if (!extraction) return 0;
    let count = 0;
    if (extraction.name) count++;
    if (extraction.title) count++;
    if (extraction.company) count++;
    if (extraction.location) count++;
    return count;
}

/**
 * Get list of filled field names
 */
function getFilledFieldNames(extraction: SnippetExtraction | null): string[] {
    if (!extraction) return [];
    const fields: string[] = [];
    if (extraction.name) fields.push("name");
    if (extraction.title) fields.push("title");
    if (extraction.company) fields.push("company");
    if (extraction.location) fields.push("location");
    return fields;
}

// ============================================================
// STEP 4: CHOOSE BEST NON-LINKEDIN PAGE TO SCRAPE
// ============================================================

const PageSelectionSchema = z.object({
    selectedUrl: z.string().nullable().describe("Best URL to scrape, or null if none suitable"),
    reason: z.string().describe("Why this URL was selected"),
});

/**
 * Domains to avoid for scraping
 */
const BLOCKED_DOMAINS = [
    "linkedin.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "instagram.com",
    "tiktok.com",
    // Profile aggregators
    "zoominfo.com",
    "apollo.io",
    "rocketreach.co",
    "lusha.com",
    "hunter.io",
    "clearbit.com",
    "leadiq.com",
    "seamless.ai",
    "contactout.com",
    // SEO listicles
    "crunchbase.com",  // Often incomplete
    "bloomberg.com",
    "forbes.com",
    "businessinsider.com",
];

/**
 * Preferred domains for person info
 */
const PREFERRED_DOMAINS = [
    "github.com",
    "indiehackers.com",
    "producthunt.com",
    "medium.com",
    "substack.com",
    "dev.to",
    "hashnode.dev",
    // Company team pages (checked via URL pattern)
];

/**
 * Check if URL is from a blocked domain
 */
function isBlockedDomain(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

/**
 * Check if URL is from a preferred domain
 */
function isPreferredDomain(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return PREFERRED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

/**
 * Check if URL looks like a company team page
 */
function isTeamPage(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes("/team") ||
        lowerUrl.includes("/about") ||
        lowerUrl.includes("/people") ||
        lowerUrl.includes("/leadership");
}

/**
 * Select the best non-LinkedIn page to scrape
 */
async function selectBestPageToScrape(
    searchResults: SearchResult[],
    personName?: string
): Promise<string | null> {
    // Filter out blocked domains
    const candidates = searchResults.filter(r => !isBlockedDomain(r.url));

    if (candidates.length === 0) {
        logger.info("⚠️ ResolvePersonFromLinkedIn: No suitable pages to scrape");
        return null;
    }

    // Sort by preference
    const sorted = [...candidates].sort((a, b) => {
        // Preferred domains first
        const aPreferred = isPreferredDomain(a.url) ? 1 : 0;
        const bPreferred = isPreferredDomain(b.url) ? 1 : 0;
        if (aPreferred !== bPreferred) return bPreferred - aPreferred;

        // Team pages second
        const aTeam = isTeamPage(a.url) ? 1 : 0;
        const bTeam = isTeamPage(b.url) ? 1 : 0;
        if (aTeam !== bTeam) return bTeam - aTeam;

        // Position (lower = better)
        return a.position - b.position;
    });

    // Use LLM to select best option
    const candidateList = sorted.slice(0, 5).map((r, i) =>
        `[${i + 1}] ${r.url}\n    Title: ${r.title}\n    Snippet: ${r.snippet}`
    ).join("\n\n");

    const systemPrompt = `You select the best page to scrape for person information.

RULES:
1. Choose a page likely to contain reliable professional information
2. Prefer: personal websites, company team pages, GitHub profiles, interview articles
3. Avoid: social media, aggregator sites, SEO listicles
4. Return null if no suitable page exists`;

    const userPrompt = `Select the best page to scrape for information about ${personName || "this person"}:

${candidateList}

Return the URL of the best page, or null if none are suitable.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: PageSelectionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        if (result.object.selectedUrl) {
            logger.info("✅ ResolvePersonFromLinkedIn: Page selected for scraping", {
                url: result.object.selectedUrl,
                reason: result.object.reason,
            });
        }

        return result.object.selectedUrl;
    } catch (error) {
        logger.error("❌ ResolvePersonFromLinkedIn: Page selection failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        // Fallback: return first non-blocked result
        return sorted[0]?.url || null;
    }
}

// ============================================================
// STEP 5: SCRAPE SINGLE PAGE
// ============================================================

/**
 * Scrape visible text from a single page
 */
async function scrapePage(url: string): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; GlazeBot/1.0)",
                "Accept": "text/html",
            },
            redirect: "follow",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            logger.warn("⚠️ ResolvePersonFromLinkedIn: Page fetch failed", {
                url,
                status: response.status,
            });
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles, etc.
        $("script, style, noscript, iframe, svg, nav, footer, header").remove();

        // Get visible text
        const text = $("body").text()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 8000); // Limit to 8k chars

        return text;
    } catch (error) {
        clearTimeout(timeoutId);
        logger.error("❌ ResolvePersonFromLinkedIn: Page scrape failed", {
            url,
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// STEP 6: LLM EXTRACTION FROM PAGE CONTENT
// ============================================================

const PageExtractionSchema = z.object({
    name: z.string().nullable().describe("Person's full name if explicitly stated"),
    title: z.string().nullable().describe("Job title/role if explicitly stated"),
    company: z.string().nullable().describe("Current company name if explicitly stated"),
    location: z.string().nullable().describe("Location if explicitly stated"),
});

type PageExtraction = z.infer<typeof PageExtractionSchema>;

/**
 * Extract person info from scraped page content
 */
async function extractFromPageContent(
    pageContent: string,
    personName?: string
): Promise<PageExtraction | null> {
    const systemPrompt = `You extract person information from webpage content.

RULES - VERY IMPORTANT:
1. Extract ONLY information explicitly stated in the page
2. Do NOT infer or guess missing fields
3. Return null for any field that is not clearly stated
4. If the page mentions multiple people, focus on ${personName || "the main subject"}`;

    const userPrompt = `Extract person information from this webpage:

${pageContent}

Extract only explicitly stated: name, title, company, location.
Return null for anything not clearly stated.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: PageExtractionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        logger.info("✅ ResolvePersonFromLinkedIn: Page extraction complete", {
            name: result.object.name,
            title: result.object.title,
            company: result.object.company,
            location: result.object.location,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ ResolvePersonFromLinkedIn: Page extraction failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// STEP 7: CONFIDENCE SCORING
// ============================================================

/**
 * Calculate confidence score based on filled fields and sources
 */
function calculateConfidence(
    snippetExtraction: SnippetExtraction | null,
    pageExtraction: PageExtraction | null,
    usedScraping: boolean
): number {
    let confidence = 0;

    // Count fields from each source
    const snippetFields = getFilledFieldNames(snippetExtraction);
    const pageFields: string[] = [];

    // Merge extractions (snippets take priority)
    const merged = {
        name: snippetExtraction?.name || pageExtraction?.name || null,
        title: snippetExtraction?.title || pageExtraction?.title || null,
        company: snippetExtraction?.company || pageExtraction?.company || null,
        location: snippetExtraction?.location || pageExtraction?.location || null,
    };

    // Track which fields came from page (not snippets)
    if (!snippetExtraction?.name && pageExtraction?.name) pageFields.push("name");
    if (!snippetExtraction?.title && pageExtraction?.title) pageFields.push("title");
    if (!snippetExtraction?.company && pageExtraction?.company) pageFields.push("company");
    if (!snippetExtraction?.location && pageExtraction?.location) pageFields.push("location");

    // Add points for each field
    if (merged.name) confidence += 0.30;
    if (merged.title) confidence += 0.25;
    if (merged.company) confidence += 0.25;
    if (merged.location) confidence += 0.20;

    // Apply caps based on source
    if (usedScraping) {
        // Fallback page used → cap at 0.8
        confidence = Math.min(0.8, confidence);
    } else {
        // Snippets only → cap at 0.75
        confidence = Math.min(0.75, confidence);
    }

    return confidence;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Resolve person profile from LinkedIn or name+company
 * 
 * Uses Google snippets as primary source, falls back to scraping
 * NEVER scrapes LinkedIn directly
 */
export async function resolvePersonFromLinkedIn(
    options: {
        linkedinUrl?: string;
        name?: string;
        company?: string;
    }
): Promise<PersonProfile> {
    const { linkedinUrl, name, company } = options;

    logger.info("🔍 ResolvePersonFromLinkedIn: Starting", {
        linkedinUrl,
        name,
        company,
    });

    // Validate inputs
    if (!linkedinUrl && !name) {
        logger.warn("⚠️ ResolvePersonFromLinkedIn: No linkedinUrl or name provided");
        return {
            name: null,
            title: null,
            company: null,
            location: null,
            linkedinUrl: linkedinUrl || null,
            confidence: 0,
            source: "failed",
            fieldsFromSnippets: [],
            fieldsFromScrape: [],
        };
    }

    // STEP 1: Google search (mandatory)
    const searchQuery = buildSearchQuery(linkedinUrl, name, company);
    logger.info("🔍 ResolvePersonFromLinkedIn: Searching", { query: searchQuery });

    const searchResults = await serperSearch(searchQuery);

    if (searchResults.length === 0) {
        logger.warn("⚠️ ResolvePersonFromLinkedIn: No search results");
        return {
            name: name || null,
            title: null,
            company: company || null,
            location: null,
            linkedinUrl: linkedinUrl || null,
            confidence: 0.1,
            source: "failed",
            fieldsFromSnippets: [],
            fieldsFromScrape: [],
        };
    }

    logger.info("✅ ResolvePersonFromLinkedIn: Search complete", {
        resultCount: searchResults.length,
    });

    // STEP 2: Snippet-based extraction FIRST
    const snippetExtraction = await extractFromSnippets(searchResults, name, company);

    // STEP 3: Check completeness threshold
    const filledFields = countFilledFields(snippetExtraction);
    const snippetFieldNames = getFilledFieldNames(snippetExtraction);

    logger.info("📊 ResolvePersonFromLinkedIn: Completeness check", {
        filledFields,
        fieldNames: snippetFieldNames,
        threshold: 3,
    });

    let pageExtraction: PageExtraction | null = null;
    let usedScraping = false;
    let scrapeFieldNames: string[] = [];

    // STEP 4-6: Fallback to scraping if needed
    if (filledFields < 3) {
        logger.info("🔄 ResolvePersonFromLinkedIn: Falling back to scraping");

        // STEP 4: Select best page to scrape
        const pageUrl = await selectBestPageToScrape(searchResults, name);

        if (pageUrl) {
            // STEP 5: Scrape the page
            const pageContent = await scrapePage(pageUrl);

            if (pageContent) {
                // STEP 6: Extract from page content
                pageExtraction = await extractFromPageContent(pageContent, name);
                usedScraping = true;

                // Track which fields came from scraping
                if (pageExtraction) {
                    if (!snippetExtraction?.name && pageExtraction.name) scrapeFieldNames.push("name");
                    if (!snippetExtraction?.title && pageExtraction.title) scrapeFieldNames.push("title");
                    if (!snippetExtraction?.company && pageExtraction.company) scrapeFieldNames.push("company");
                    if (!snippetExtraction?.location && pageExtraction.location) scrapeFieldNames.push("location");
                }
            }
        }
    }

    // STEP 7: Calculate confidence
    const confidence = calculateConfidence(snippetExtraction, pageExtraction, usedScraping);

    // Merge results (snippets take priority)
    const result: PersonProfile = {
        name: snippetExtraction?.name || pageExtraction?.name || name || null,
        title: snippetExtraction?.title || pageExtraction?.title || null,
        company: snippetExtraction?.company || pageExtraction?.company || company || null,
        location: snippetExtraction?.location || pageExtraction?.location || null,
        linkedinUrl: snippetExtraction?.linkedinUrl || linkedinUrl ||
            searchResults.find(r => r.url.includes("linkedin.com/in/"))?.url || null,
        confidence,
        source: usedScraping ? "snippets+scrape" : "snippets",
        fieldsFromSnippets: snippetFieldNames,
        fieldsFromScrape: scrapeFieldNames,
    };

    logger.info("✅ ResolvePersonFromLinkedIn: Complete", {
        name: result.name,
        title: result.title,
        company: result.company,
        location: result.location,
        confidence: result.confidence,
        source: result.source,
    });

    return result;
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * ResolvePersonFromLinkedIn Provider for integration with enrichment system
 */
export class ResolvePersonFromLinkedInProvider {
    name = "resolve_person_from_linkedin";
    tier = "cheap" as const;
    costCents = 2; // Serper + LLM

    async enrich(options: {
        linkedinUrl?: string;
        name?: string;
        company?: string;
    }): Promise<PersonProfile> {
        return resolvePersonFromLinkedIn(options);
    }
}

// Export singleton
export const resolvePersonFromLinkedInProvider = new ResolvePersonFromLinkedInProvider();
