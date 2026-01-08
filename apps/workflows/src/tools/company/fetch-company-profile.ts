/**
 * FetchCompanyProfile Tool
 * 
 * Comprehensive company enrichment from website URL.
 * 
 * Input: websiteUrl
 * Output: description, industry, founded, location
 * 
 * Three-tier waterfall approach:
 * 1. Lightweight: LLM analysis of domain + page metadata
 * 2. Medium: Serper search + LLM analysis
 * 3. Deep: Full page scrape + LLM analysis
 * 
 * Each tier has confidence thresholds - if not met, escalates to next tier.
 */

import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { logger } from "@trigger.dev/sdk";
import { z } from "zod";
import * as cheerio from "cheerio";

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Company Profile Result
 */
export interface CompanyProfile {
    description: string | null;
    industry: string | null;
    founded: string | null;
    location: string | null;
    confidence: number;
    tier: 'lightweight' | 'serper' | 'deep_scrape';
    reason?: string;
}

/**
 * Page metadata (lightweight)
 */
interface PageMetadata {
    domain: string;
    title: string | null;
    description: string | null;
    isReachable: boolean;
}

/**
 * LLM extraction schema
 */
const CompanyDataSchema = z.object({
    industry: z.string().nullable().describe("Company's industry or sector (e.g., 'Software', 'E-commerce', 'Healthcare Tech')"),
    description: z.string().nullable().describe("Brief 1-2 sentence company description"),
    founded: z.string().nullable().describe("Founded year or date (e.g., '2015', '2010')"),
    location: z.string().nullable().describe("Company headquarters location (e.g., 'San Francisco, CA', 'Remote')"),
    confidence: z.number().min(0).max(1).describe("Confidence in the extracted data (0-1)"),
    reasoning: z.string().describe("Brief explanation of confidence level and data sources used"),
});

type CompanyData = z.infer<typeof CompanyDataSchema>;

/**
 * Fetch page metadata (title, description) - Lightweight request
 */
async function fetchPageMetadata(websiteUrl: string): Promise<PageMetadata> {
    // Normalize URL
    let url = websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    const domain = new URL(url).hostname;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; GlazeBot/1.0)",
                "Accept": "text/html",
            },
            redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return { domain, title: null, description: null, isReachable: false };
        }

        const html = await response.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch?.[1]?.trim() ?? null;

        // Extract meta description
        const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
        const description = descMatch?.[1]?.trim() ?? null;

        return { domain, title, description, isReachable: true };
    } catch (error) {
        clearTimeout(timeout);
        logger.warn("⚠️ FetchCompanyProfile: Failed to fetch page metadata", {
            url,
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return { domain, title: null, description: null, isReachable: false };
    }
}

/**
 * Tier 1: Lightweight LLM analysis from domain + page metadata
 */
async function tier1_lightweightAnalysis(metadata: PageMetadata): Promise<CompanyData | null> {
    if (!metadata.isReachable || (!metadata.title && !metadata.description)) {
        logger.debug("🔍 Tier 1: Insufficient data for lightweight analysis");
        return null;
    }

    const systemPrompt = `You are a company research analyst. Based ONLY on the provided domain, page title, and meta description, extract company information.

RULES:
1. Only extract information you can confidently infer from the given data
2. For industry: Use domain name + title/description to classify (e.g., "shopify.com" + "E-commerce platform" → "E-commerce Software")
3. If you cannot determine a field with reasonable confidence, set it to null
4. Be conservative - only return high confidence if data is clear
5. Confidence should reflect how certain you are based on available signals`;

    const userPrompt = `Domain: ${metadata.domain}
Title: ${metadata.title || 'Not available'}
Description: ${metadata.description || 'Not available'}

Extract: industry, description, founded year, location.
If information is not available in the provided data, return null for that field.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: CompanyDataSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2,
        });

        logger.info("✅ Tier 1: Lightweight analysis complete", {
            domain: metadata.domain,
            confidence: result.object.confidence,
            industry: result.object.industry,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ Tier 1: LLM error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Tier 2: Serper search + LLM analysis
 */
async function tier2_serperAnalysis(websiteUrl: string, domain: string): Promise<CompanyData | null> {
    const serperApiKey = process.env.SERPER_API_KEY;
    if (!serperApiKey) {
        logger.warn("⚠️ Tier 2: SERPER_API_KEY not configured, skipping");
        return null;
    }

    // Search query: domain name as company identifier
    const companyName = domain.split('.')[0] || domain;
    const query = `${companyName} company`;

    try {
        const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
                "X-API-KEY": serperApiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: query,
                num: 3, // Get top 3 results
            }),
        });

        if (!response.ok) {
            logger.warn("⚠️ Tier 2: Serper API failed", { status: response.status });
            return null;
        }

        const data = await response.json() as {
            organic?: Array<{
                title: string;
                snippet: string;
                link: string;
            }>;
            knowledgeGraph?: {
                title?: string;
                type?: string;
                description?: string;
                attributes?: Record<string, string>;
            };
        };

        // Build context from search results
        const contextParts: string[] = [];

        // Knowledge graph (highest quality signal)
        if (data.knowledgeGraph) {
            const kg = data.knowledgeGraph;
            contextParts.push(`[Knowledge Graph]
Title: ${kg.title || 'N/A'}
Type: ${kg.type || 'N/A'}
Description: ${kg.description || 'N/A'}
${kg.attributes ? Object.entries(kg.attributes).map(([k, v]) => `${k}: ${v}`).join('\n') : ''}`);
        }

        // Organic results
        if (data.organic && data.organic.length > 0) {
            data.organic.slice(0, 3).forEach((result, idx) => {
                contextParts.push(`[Search Result ${idx + 1}]
Title: ${result.title}
Snippet: ${result.snippet}
Link: ${result.link}`);
            });
        }

        if (contextParts.length === 0) {
            logger.debug("🔍 Tier 2: No search results found");
            return null;
        }

        const systemPrompt = `You are a company research analyst. Based on search results data, extract company information.

RULES:
1. Prioritize data from Knowledge Graph if available (most authoritative)
2. Use organic search results to fill gaps or corroborate
3. For industry: Classify based on what the company does (e.g., "Social Media", "Cloud Computing")
4. Only include information you can verify from the search results
5. If search results are unclear or conflicting, reduce confidence accordingly`;

        const userPrompt = `Domain: ${domain}

Search Results:
${contextParts.join('\n\n')}

Extract: industry, description, founded year, location.
If information is not available in search results, return null for that field.`;

        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: CompanyDataSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2,
        });

        logger.info("✅ Tier 2: Serper analysis complete", {
            domain,
            confidence: result.object.confidence,
            industry: result.object.industry,
            hasKG: !!data.knowledgeGraph,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ Tier 2: Serper analysis error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Tier 3: Deep page scraping + LLM analysis
 */
async function tier3_deepScrape(websiteUrl: string, domain: string): Promise<CompanyData | null> {
    // Normalize URL
    let url = websiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // Longer timeout for deep scrape

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; GlazeBot/1.0)",
                "Accept": "text/html",
            },
            redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) {
            logger.warn("⚠️ Tier 3: Page unreachable", { url, status: response.status });
            return null;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Remove script, style, and other non-content elements
        $('script, style, noscript, iframe, svg').remove();

        // Extract key sections
        const title = $('title').text().trim();
        const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';

        // Try to find about/description content
        const aboutSections = [
            $('section:contains("About")').text(),
            $('div[class*="about"]').text(),
            $('section[class*="hero"]').text(),
            $('main').first().text(),
            $('body').text(), // Fallback
        ].filter(Boolean);

        // Extract text, limit to ~2000 chars to avoid token limits
        let extractedText = aboutSections[0] || '';
        extractedText = extractedText
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 2000);

        if (!extractedText || extractedText.length < 50) {
            logger.warn("⚠️ Tier 3: Insufficient content extracted", { domain });
            return null;
        }

        const systemPrompt = `You are a company research analyst. Based on scraped website content, extract company information.

RULES:
1. Analyze the full content to understand what the company does
2. For industry: Classify based on their products/services (e.g., "SaaS", "Consulting", "Manufacturing")
3. Extract any mentioned founding dates, locations, or company descriptions
4. Be thorough but conservative - if data isn't explicitly mentioned, return null
5. Since this is scraped content, confidence should reflect clarity and presence of data`;

        const userPrompt = `Domain: ${domain}
Page Title: ${title}
Meta Description: ${metaDesc}

Extracted Content:
${extractedText}

Extract: industry, description, founded year, location.
Analyze the content carefully to determine these fields.`;

        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: CompanyDataSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.2,
        });

        logger.info("✅ Tier 3: Deep scrape analysis complete", {
            domain,
            confidence: result.object.confidence,
            industry: result.object.industry,
            contentLength: extractedText.length,
        });

        return result.object;
    } catch (error) {
        clearTimeout(timeout);
        logger.error("❌ Tier 3: Deep scrape error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Main FetchCompanyProfile function
 * 
 * Executes waterfall strategy:
 * 1. Tier 1 (lightweight) - if confidence >= 0.75, return
 * 2. Tier 2 (serper) - if confidence >= 0.6, return
 * 3. Tier 3 (deep scrape) - return regardless (last resort)
 */
export async function fetchCompanyProfile(websiteUrl: string): Promise<CompanyProfile> {
    logger.info("🏢 FetchCompanyProfile: Starting", { websiteUrl });

    // Normalize and extract domain
    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
        normalizedUrl = `https://${normalizedUrl}`;
    }
    const domain = new URL(normalizedUrl).hostname;

    // TIER 1: Lightweight analysis
    logger.info("🔍 Starting Tier 1: Lightweight Analysis");
    const metadata = await fetchPageMetadata(normalizedUrl);
    const tier1Result = await tier1_lightweightAnalysis(metadata);

    if (tier1Result && tier1Result.confidence >= 0.75) {
        logger.info("✅ Tier 1 SUCCESS - High confidence result", {
            confidence: tier1Result.confidence,
            industry: tier1Result.industry,
        });
        return {
            description: tier1Result.description,
            industry: tier1Result.industry,
            founded: tier1Result.founded,
            location: tier1Result.location,
            confidence: tier1Result.confidence,
            tier: 'lightweight',
            reason: tier1Result.reasoning,
        };
    }

    // TIER 2: Serper search
    logger.info("🔍 Starting Tier 2: Serper Analysis (Tier 1 confidence too low or failed)");
    const tier2Result = await tier2_serperAnalysis(normalizedUrl, domain);

    if (tier2Result && tier2Result.confidence >= 0.6) {
        logger.info("✅ Tier 2 SUCCESS - Medium confidence result", {
            confidence: tier2Result.confidence,
            industry: tier2Result.industry,
        });
        return {
            description: tier2Result.description,
            industry: tier2Result.industry,
            founded: tier2Result.founded,
            location: tier2Result.location,
            confidence: tier2Result.confidence,
            tier: 'serper',
            reason: tier2Result.reasoning,
        };
    }

    // TIER 3: Deep scrape (last resort)
    logger.info("🔍 Starting Tier 3: Deep Scrape (Tier 2 failed or under-confident)");
    const tier3Result = await tier3_deepScrape(normalizedUrl, domain);

    if (tier3Result) {
        logger.info("✅ Tier 3 COMPLETE - Returning best available result", {
            confidence: tier3Result.confidence,
            industry: tier3Result.industry,
        });
        return {
            description: tier3Result.description,
            industry: tier3Result.industry,
            founded: tier3Result.founded,
            location: tier3Result.location,
            confidence: tier3Result.confidence,
            tier: 'deep_scrape',
            reason: tier3Result.reasoning,
        };
    }

    // ALL TIERS FAILED - Return empty result
    logger.warn("⚠️ All tiers failed - returning null result", { websiteUrl });
    return {
        description: null,
        industry: null,
        founded: null,
        location: null,
        confidence: 0,
        tier: 'deep_scrape',
        reason: 'All enrichment tiers failed - unable to extract company data',
    };
}

/**
 * FetchCompanyProfile Provider class (for integration with enrichment system)
 */
export class FetchCompanyProfileProvider {
    name = "fetch_company_profile";
    tier = "premium" as const; // Can escalate through multiple tiers
    costCents = 2.0; // Variable cost depending on tier reached

    async enrich(websiteUrl: string): Promise<CompanyProfile> {
        return fetchCompanyProfile(websiteUrl);
    }
}

// Export singleton
export const fetchCompanyProfileProvider = new FetchCompanyProfileProvider();
