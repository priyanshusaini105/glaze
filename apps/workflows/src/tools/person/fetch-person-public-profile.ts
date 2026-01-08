/**
 * FetchPersonPublicProfile Tool (MVP)
 * 
 * Given a verified person identity, fetch a short public bio and social links.
 * 
 * RULES:
 * - This tool NEVER decides who the person is
 * - It only decorates an already resolved person
 * - LinkedIn is NEVER scraped
 * - Snippet-first extraction (scraping is rare fallback)
 * 
 * Input: name + company (+ optional linkedinUrl)
 * Output: bio, socialLinks (twitter, github, personalWebsite)
 * 
 * "Given a verified person identity, use Google search results to extract a 
 * short professional bio and any social links directly from titles and snippets. 
 * If insufficient information is available, select one non-LinkedIn authoritative 
 * page, scrape only that page, and extract explicitly stated bio text and social 
 * links. Do not infer or invent information, and return null for missing fields."
 */

import { logger } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import * as cheerio from "cheerio";

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// TYPES
// ============================================================

export interface SocialLinks {
    twitter?: string;
    github?: string;
    personalWebsite?: string;
}

export interface FetchPersonPublicProfileResult {
    bio: string | null;
    socialLinks: SocialLinks;
    source: "snippets" | "snippets+scrape" | "not_found";
    scrapedUrl?: string;
}

interface SearchResult {
    title: string;
    snippet: string;
    url: string;
    position: number;
}

// ============================================================
// STEP 1: GOOGLE DISCOVERY
// ============================================================

/**
 * Perform Serper search
 */
async function serperSearch(query: string): Promise<SearchResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        logger.warn("⚠️ FetchPersonPublicProfile: SERPER_API_KEY not configured");
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

        return results;
    } catch (error) {
        logger.error("❌ Serper search failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return [];
    }
}

/**
 * Run multiple discovery searches for a person
 */
async function discoverPersonContent(
    name: string,
    company: string
): Promise<SearchResult[]> {
    logger.info("🔍 FetchPersonPublicProfile: Running discovery searches", {
        name,
        company,
    });

    // Multiple targeted queries
    const queries = [
        `"${name}" "${company}"`,
        `"${name}" twitter`,
        `"${name}" github`,
        `"${name}" personal website blog`,
    ];

    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
        const results = await serperSearch(query);

        for (const result of results.slice(0, 5)) {
            // Deduplicate by URL
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                allResults.push(result);
            }
        }
    }

    logger.info("✅ FetchPersonPublicProfile: Discovery complete", {
        totalResults: allResults.length,
    });

    return allResults;
}

// ============================================================
// STEP 2: SNIPPET-FIRST EXTRACTION
// ============================================================

const SnippetExtractionSchema = z.object({
    bio: z.string().nullable().describe("Short professional bio (1-2 sentences, max 300 chars)"),
    twitter: z.string().nullable().describe("Twitter/X profile URL if found"),
    github: z.string().nullable().describe("GitHub profile URL if found"),
    personalWebsite: z.string().nullable().describe("Personal website/blog URL if found"),
});

type SnippetExtraction = z.infer<typeof SnippetExtractionSchema>;

/**
 * Extract bio and social links from search snippets only
 */
async function extractFromSnippets(
    searchResults: SearchResult[],
    name: string,
    company: string
): Promise<SnippetExtraction | null> {
    if (searchResults.length === 0) {
        return null;
    }

    // Build context from titles and snippets
    // Filter out LinkedIn URLs from content consideration
    const filteredResults = searchResults.filter(
        r => !r.url.includes("linkedin.com")
    );

    const snippetContext = filteredResults
        .slice(0, 8)
        .map((r, i) => `[${i + 1}] Title: ${r.title}\n    Snippet: ${r.snippet}\n    URL: ${r.url}`)
        .join("\n\n");

    const systemPrompt = `You extract professional bio and social links from Google search results.

RULES - VERY IMPORTANT:
1. Using ONLY the provided titles and snippets, extract:
   - A short professional bio (1-2 sentences max, ≤300 chars)
   - Any explicitly mentioned social links (Twitter, GitHub, personal site)
2. Do NOT infer achievements
3. Do NOT invent links
4. If not clearly stated, return null
5. Social links must be valid URLs
6. Ignore LinkedIn URLs

For Twitter, accept: twitter.com/handle or x.com/handle
For GitHub, accept: github.com/username
For personal website, accept any non-social domain`;

    const userPrompt = `Extract bio and social links for ${name} (${company}) from these search results:

${snippetContext}

Return bio (1-2 sentences) and any social links found.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: SnippetExtractionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        logger.info("✅ FetchPersonPublicProfile: Snippet extraction complete", {
            hasBio: !!result.object.bio,
            hasTwitter: !!result.object.twitter,
            hasGithub: !!result.object.github,
            hasWebsite: !!result.object.personalWebsite,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ FetchPersonPublicProfile: Snippet extraction failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// STEP 3: CHECK USEFULNESS
// ============================================================

/**
 * Check if we have useful data from snippets
 */
function hasUsefulData(extraction: SnippetExtraction | null): boolean {
    if (!extraction) return false;

    return (
        extraction.bio !== null ||
        extraction.twitter !== null ||
        extraction.github !== null ||
        extraction.personalWebsite !== null
    );
}

// ============================================================
// STEP 4: FALLBACK PAGE SELECTION
// ============================================================

/**
 * Domains to block from scraping
 */
const BLOCKED_DOMAINS = [
    "linkedin.com",
    "facebook.com",
    "instagram.com",
    "tiktok.com",
    // SEO bio aggregators
    "zoominfo.com",
    "apollo.io",
    "rocketreach.co",
    "lusha.com",
    "clearbit.com",
    "crunchbase.com",
    "bloomberg.com",
    "forbes.com",
    // Search engines
    "google.com",
    "bing.com",
    "duckduckgo.com",
];

/**
 * Preferred domains for person info
 */
const PREFERRED_DOMAINS = [
    "github.com",
    "twitter.com",
    "x.com",
    "medium.com",
    "substack.com",
    "dev.to",
    "indiehackers.com",
    "producthunt.com",
];

/**
 * Check if URL is blocked
 */
function isBlockedUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return BLOCKED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

/**
 * Check if URL is preferred
 */
function isPreferredUrl(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return PREFERRED_DOMAINS.some(domain => lowerUrl.includes(domain));
}

/**
 * Check if URL looks like a team/about page
 */
function isTeamPage(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes("/team") ||
        lowerUrl.includes("/about") ||
        lowerUrl.includes("/people") ||
        lowerUrl.includes("/author");
}

const PageSelectionSchema = z.object({
    selectedUrl: z.string().nullable().describe("Best URL to scrape, or null"),
    reason: z.string().describe("Why this URL was selected"),
});

/**
 * Select best fallback page to scrape
 */
async function selectFallbackPage(
    searchResults: SearchResult[],
    name: string
): Promise<string | null> {
    // Filter and sort candidates
    const candidates = searchResults
        .filter(r => !isBlockedUrl(r.url))
        .sort((a, b) => {
            // Preferred domains first
            const aPreferred = isPreferredUrl(a.url) ? 1 : 0;
            const bPreferred = isPreferredUrl(b.url) ? 1 : 0;
            if (aPreferred !== bPreferred) return bPreferred - aPreferred;

            // Team pages
            const aTeam = isTeamPage(a.url) ? 1 : 0;
            const bTeam = isTeamPage(b.url) ? 1 : 0;
            if (aTeam !== bTeam) return bTeam - aTeam;

            // Position
            return a.position - b.position;
        });

    if (candidates.length === 0) {
        logger.info("⚠️ FetchPersonPublicProfile: No suitable fallback pages");
        return null;
    }

    // Use LLM to pick the best option
    const candidateList = candidates.slice(0, 5).map((r, i) =>
        `[${i + 1}] ${r.url}\n    Title: ${r.title}\n    Snippet: ${r.snippet}`
    ).join("\n\n");

    const systemPrompt = `You select the best page to scrape for a person's bio and social links.

RULES:
1. Choose a page likely to have an official bio or social links
2. Prefer: personal websites, company team pages, GitHub profiles
3. Avoid: social media, aggregator sites, news articles
4. Return null if no suitable page exists`;

    const userPrompt = `Select the best page for ${name}'s bio and social links:

${candidateList}

Return the URL of the best page, or null.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: PageSelectionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        if (result.object.selectedUrl) {
            logger.info("✅ FetchPersonPublicProfile: Fallback page selected", {
                url: result.object.selectedUrl,
                reason: result.object.reason,
            });
        }

        return result.object.selectedUrl;
    } catch (error) {
        logger.error("❌ FetchPersonPublicProfile: Page selection failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        // Fallback: return first candidate
        return candidates[0]?.url || null;
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
            logger.warn("⚠️ FetchPersonPublicProfile: Page fetch failed", {
                url,
                status: response.status,
            });
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove scripts, styles, etc.
        $("script, style, noscript, iframe, svg, nav, footer").remove();

        // Get visible text
        const text = $("body").text()
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 10000); // Limit to 10k chars

        return text;
    } catch (error) {
        clearTimeout(timeoutId);
        logger.error("❌ FetchPersonPublicProfile: Page scrape failed", {
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
    bio: z.string().nullable().describe("Short professional bio (1-2 sentences, max 300 chars)"),
    twitter: z.string().nullable().describe("Twitter/X profile URL if found"),
    github: z.string().nullable().describe("GitHub profile URL if found"),
    personalWebsite: z.string().nullable().describe("Personal website URL if found"),
});

/**
 * Extract bio and social links from scraped page content
 */
async function extractFromPageContent(
    pageContent: string,
    name: string
): Promise<SnippetExtraction | null> {
    const systemPrompt = `You extract bio and social links from a webpage.

RULES:
1. Extract a short professional bio (1-2 sentences, max 300 chars)
2. Extract social links (Twitter, GitHub, personal website)
3. Only extract what is EXPLICITLY present
4. If unclear, return null
5. Validate URLs are properly formatted`;

    const userPrompt = `Extract bio and social links for ${name} from this page:

${pageContent.slice(0, 6000)}

Return bio and any social links found.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: PageExtractionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        logger.info("✅ FetchPersonPublicProfile: Page extraction complete", {
            hasBio: !!result.object.bio,
            hasTwitter: !!result.object.twitter,
            hasGithub: !!result.object.github,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ FetchPersonPublicProfile: Page extraction failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// STEP 7: OUTPUT CLEANUP
// ============================================================

/**
 * Validate and normalize a social URL
 */
function validateSocialUrl(url: string | null | undefined, platform: string): string | undefined {
    if (!url) return undefined;

    try {
        const parsedUrl = new URL(url);
        const hostname = parsedUrl.hostname.toLowerCase();

        switch (platform) {
            case "twitter":
                if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
                    return url;
                }
                break;
            case "github":
                if (hostname.includes("github.com")) {
                    return url;
                }
                break;
            case "personalWebsite":
                // Reject known social/aggregator domains
                const blocked = [
                    "linkedin.com", "twitter.com", "x.com", "facebook.com",
                    "instagram.com", "github.com", "medium.com", "substack.com"
                ];
                if (!blocked.some(d => hostname.includes(d))) {
                    return url;
                }
                break;
        }
    } catch {
        // Invalid URL
    }

    return undefined;
}

/**
 * Clean bio text
 */
function cleanBio(bio: string | null | undefined): string | null {
    if (!bio) return null;

    // Trim and limit length
    let cleaned = bio.trim();

    if (cleaned.length > 300) {
        cleaned = cleaned.slice(0, 297) + "...";
    }

    return cleaned || null;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Fetch public profile (bio + social links) for a verified person
 * 
 * This tool only decorates an already resolved person.
 * It never decides who the person is.
 */
export async function fetchPersonPublicProfile(
    name: string,
    company: string,
    linkedinUrl?: string
): Promise<FetchPersonPublicProfileResult> {
    logger.info("🔍 FetchPersonPublicProfile: Starting", {
        name,
        company,
        hasLinkedIn: !!linkedinUrl,
    });

    // Validate inputs
    if (!name || !company) {
        logger.warn("⚠️ FetchPersonPublicProfile: Missing required inputs");
        return {
            bio: null,
            socialLinks: {},
            source: "not_found",
        };
    }

    // STEP 1: Google discovery (always)
    const searchResults = await discoverPersonContent(name, company);

    if (searchResults.length === 0) {
        logger.warn("⚠️ FetchPersonPublicProfile: No search results");
        return {
            bio: null,
            socialLinks: {},
            source: "not_found",
        };
    }

    // STEP 2: Snippet-first extraction (primary path)
    const snippetExtraction = await extractFromSnippets(searchResults, name, company);

    // STEP 3: Check usefulness
    if (hasUsefulData(snippetExtraction)) {
        // We have something useful from snippets!
        logger.info("✅ FetchPersonPublicProfile: Got useful data from snippets");

        return {
            bio: cleanBio(snippetExtraction?.bio),
            socialLinks: {
                twitter: validateSocialUrl(snippetExtraction?.twitter, "twitter"),
                github: validateSocialUrl(snippetExtraction?.github, "github"),
                personalWebsite: validateSocialUrl(snippetExtraction?.personalWebsite, "personalWebsite"),
            },
            source: "snippets",
        };
    }

    // STEP 4: Fallback - select page to scrape
    logger.info("🔄 FetchPersonPublicProfile: Falling back to scraping");

    const fallbackUrl = await selectFallbackPage(searchResults, name);

    if (!fallbackUrl) {
        logger.info("⚠️ FetchPersonPublicProfile: No suitable fallback page");
        return {
            bio: null,
            socialLinks: {},
            source: "not_found",
        };
    }

    // STEP 5: Scrape single page
    const pageContent = await scrapePage(fallbackUrl);

    if (!pageContent) {
        return {
            bio: null,
            socialLinks: {},
            source: "not_found",
        };
    }

    // STEP 6: Extract from page content
    const pageExtraction = await extractFromPageContent(pageContent, name);

    // STEP 7: Output cleanup
    return {
        bio: cleanBio(pageExtraction?.bio),
        socialLinks: {
            twitter: validateSocialUrl(pageExtraction?.twitter, "twitter"),
            github: validateSocialUrl(pageExtraction?.github, "github"),
            personalWebsite: validateSocialUrl(pageExtraction?.personalWebsite, "personalWebsite"),
        },
        source: "snippets+scrape",
        scrapedUrl: fallbackUrl,
    };
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * FetchPersonPublicProfile Provider for integration with enrichment system
 */
export class FetchPersonPublicProfileProvider {
    name = "fetch_person_public_profile";
    tier = "cheap" as const;
    costCents = 2; // Serper + LLM

    async enrich(name: string, company: string, linkedinUrl?: string): Promise<FetchPersonPublicProfileResult> {
        return fetchPersonPublicProfile(name, company, linkedinUrl);
    }
}

// Export singleton
export const fetchPersonPublicProfileProvider = new FetchPersonPublicProfileProvider();
