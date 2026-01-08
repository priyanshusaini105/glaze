/**
 * SERP Discovery Tool (Serper API)
 * 
 * Phase 2 deterministic enrichment tool.
 * Uses Serper.dev API to discover information via Google Search.
 * 
 * Query patterns:
 * - "Full Name" LinkedIn
 * - "Name" "Company"
 * - "Company" About
 * 
 * Returns URLs + snippets with source attribution.
 */

import { logger } from "@trigger.dev/sdk";
import { BaseProvider } from "../interfaces";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../../types/enrichment";
import { createFieldValue, SOURCE_TRUST_WEIGHTS } from "@repo/types";

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_API_URL = "https://google.serper.dev/search";

/**
 * Serper search response types
 */
interface SerperOrganicResult {
    title: string;
    link: string;
    snippet: string;
    position: number;
    sitelinks?: Array<{ title: string; link: string }>;
}

interface SerperKnowledgeGraph {
    title?: string;
    type?: string;
    description?: string;
    imageUrl?: string;
    attributes?: Record<string, string>;
}

interface SerperSearchResponse {
    searchParameters: {
        q: string;
        type: string;
        engine: string;
    };
    organic: SerperOrganicResult[];
    knowledgeGraph?: SerperKnowledgeGraph;
    answerBox?: {
        title?: string;
        answer?: string;
        snippet?: string;
    };
}

/**
 * Perform a Serper search
 */
async function performSerperSearch(query: string): Promise<SerperSearchResponse | null> {
    if (!SERPER_API_KEY) {
        logger.warn("⚠️ SerperProvider: No API key configured");
        return null;
    }

    try {
        const response = await fetch(SERPER_API_URL, {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: query,
                num: 10,
            }),
        });

        if (!response.ok) {
            logger.error("❌ SerperProvider: API error", {
                status: response.status,
                statusText: response.statusText,
            });
            return null;
        }

        return await response.json() as SerperSearchResponse;
    } catch (error) {
        logger.error("❌ SerperProvider: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Extract LinkedIn URL from search results
 */
function extractLinkedInUrl(results: SerperOrganicResult[], type: 'person' | 'company'): string | null {
    const pattern = type === 'person'
        ? /linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i
        : /linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/i;

    for (const result of results) {
        const match = result.link.match(pattern);
        if (match) {
            return result.link;
        }
    }
    return null;
}

/**
 * Extract name from LinkedIn search snippet
 */
function extractNameFromSnippet(snippet: string): string | null {
    // Common patterns in LinkedIn snippets
    // "John Smith - CEO at Company | LinkedIn"
    // "View John Smith's profile on LinkedIn"
    const patterns = [
        /^([A-Z][a-z]+ [A-Z][a-z]+)\s*[-–—]/,
        /View ([A-Z][a-z]+ [A-Z][a-z]+)'s profile/i,
        /([A-Z][a-z]+ [A-Z][a-z]+) - .* \| LinkedIn/i,
    ];

    for (const pattern of patterns) {
        const match = snippet.match(pattern);
        if (match?.[1]) {
            return match[1];
        }
    }
    return null;
}

/**
 * Extract title from LinkedIn search snippet
 */
function extractTitleFromSnippet(snippet: string): string | null {
    // "John Smith - CEO at Company"
    // "John Smith | VP of Engineering"
    const patterns = [
        /[-–—]\s*([^|]+?)\s*(?:at|@)\s*[^|]+\|/i,
        /[-–—]\s*([A-Z][a-zA-Z\s]+)\s*\|/,
        /\|\s*([A-Z][a-zA-Z\s]+?)\s*[-–—]/,
    ];

    for (const pattern of patterns) {
        const match = snippet.match(pattern);
        if (match?.[1]) {
            const title = match[1].trim();
            if (title.length > 2 && title.length < 100) {
                return title;
            }
        }
    }
    return null;
}

/**
 * Extract company info from search results
 */
function extractCompanyInfo(results: SerperOrganicResult[], knowledgeGraph?: SerperKnowledgeGraph): {
    name?: string;
    description?: string;
    website?: string;
} {
    const info: { name?: string; description?: string; website?: string } = {};

    // Try knowledge graph first
    if (knowledgeGraph) {
        info.name = knowledgeGraph.title;
        info.description = knowledgeGraph.description;
    }

    // Look for company website in organic results
    for (const result of results) {
        // Skip social media and directories
        if (result.link.includes('linkedin.com') ||
            result.link.includes('facebook.com') ||
            result.link.includes('twitter.com') ||
            result.link.includes('crunchbase.com') ||
            result.link.includes('wikipedia.org')) {
            continue;
        }

        // First non-social result is likely the company website
        if (!info.website && result.position <= 5) {
            try {
                const url = new URL(result.link);
                info.website = `${url.protocol}//${url.hostname}`;
            } catch {
                // Invalid URL
            }
        }
    }

    return info;
}

/**
 * Serper Provider for SERP Discovery
 */
export class SerperProvider extends BaseProvider {
    name = "serper";
    tier = "free" as const;
    costCents = 1; // ~1 cent per search

    protected supportedFields: EnrichmentFieldKey[] = [
        "name",
        "title",
        "company",
        "website",
        "socialLinks",
        "location",
        "shortBio",
    ];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        logger.info("🔍 SerperProvider: Starting search", {
            rowId: input.rowId,
            field,
            hasName: !!input.name,
            hasDomain: !!input.domain,
            hasCompany: !!input.company,
        });

        // Build search query based on available input
        let query = "";

        if (field === "name" || field === "title" || field === "shortBio") {
            // Person search
            if (input.linkedinUrl) {
                // Already have LinkedIn, skip SERP
                return null;
            }
            if (input.name && input.company) {
                query = `"${input.name}" "${input.company}" LinkedIn`;
            } else if (input.name) {
                query = `"${input.name}" LinkedIn`;
            } else if (input.email) {
                const namePart = input.email.split("@")[0]?.replace(/[._]/g, " ");
                if (namePart) {
                    query = `"${namePart}" LinkedIn`;
                }
            }
        } else if (field === "company" || field === "socialLinks" || field === "website") {
            // Company search
            if (input.domain) {
                query = `site:${input.domain} OR "${input.domain}" about`;
            } else if (input.company) {
                // Single query for company website
                query = `${input.company} official website - landing page`;
            } else if (input.name) {
                // Search for company by name
                query = `${input.name} official website - landing page`;
            } else if ((input as any).bio) {
                // Extract key terms from bio and search
                const bio = (input as any).bio as string;
                // Take first meaningful sentence/phrase (up to 100 chars)
                const bioSnippet = bio.slice(0, 100).split('.')[0];
                query = `${bioSnippet} company`;
            }
        }

        if (!query) {
            logger.warn("⚠️ SerperProvider: Cannot build query", { input, field });
            return null;
        }

        const response = await performSerperSearch(query);
        if (!response || !response.organic || response.organic.length === 0) {
            return null;
        }

        // Extract relevant data based on field
        let value: string | string[] | null = null;
        let confidence = SOURCE_TRUST_WEIGHTS.serper ?? 0.7;

        if (field === "name") {
            const linkedInUrl = extractLinkedInUrl(response.organic, "person");
            if (linkedInUrl) {
                // Found LinkedIn, extract name from snippet
                const linkedInResult = response.organic.find(r => r.link === linkedInUrl);
                if (linkedInResult) {
                    value = extractNameFromSnippet(linkedInResult.snippet);
                    if (value) {
                        confidence = 0.75;
                    }
                }
            }
        } else if (field === "title") {
            const linkedInResult = response.organic.find(r => r.link.includes("linkedin.com/in/"));
            if (linkedInResult) {
                value = extractTitleFromSnippet(linkedInResult.snippet);
                if (value) {
                    confidence = 0.7;
                }
            }
        } else if (field === "socialLinks") {
            const links: string[] = [];
            const linkedInUrl = extractLinkedInUrl(response.organic, input.company ? "company" : "person");
            if (linkedInUrl) links.push(linkedInUrl);

            // Look for other social links
            for (const result of response.organic) {
                if (result.link.includes("twitter.com/") && !links.includes(result.link)) {
                    links.push(result.link);
                }
                if (result.link.includes("github.com/") && !links.includes(result.link)) {
                    links.push(result.link);
                }
            }

            if (links.length > 0) {
                value = links;
                confidence = 0.8;
            }
        } else if (field === "company") {
            const companyInfo = extractCompanyInfo(response.organic, response.knowledgeGraph);
            if (companyInfo.name) {
                value = companyInfo.name;
                confidence = 0.7;
            }
        } else if (field === "website") {
            const companyInfo = extractCompanyInfo(response.organic, response.knowledgeGraph);
            if (companyInfo.website) {
                value = companyInfo.website;
                confidence = 0.8;
            }
        } else if (field === "shortBio") {
            // Extract bio from LinkedIn snippet or knowledge graph
            if (response.knowledgeGraph?.description) {
                value = response.knowledgeGraph.description;
                confidence = 0.65;
            } else {
                const linkedInResult = response.organic.find(r => r.link.includes("linkedin.com/"));
                if (linkedInResult) {
                    value = linkedInResult.snippet.slice(0, 200);
                    confidence = 0.5;
                }
            }
        }

        if (!value) {
            return null;
        }

        logger.info("✅ SerperProvider: Found data", {
            rowId: input.rowId,
            field,
            valuePreview: typeof value === "string" ? value.slice(0, 50) : `[${value.length} items]`,
            confidence,
        });

        return this.createResult(field, value, confidence, {
            query,
            resultsCount: response.organic.length,
            hasKnowledgeGraph: !!response.knowledgeGraph,
        });
    }
}

// Export singleton instance
export const serperProvider = new SerperProvider();
