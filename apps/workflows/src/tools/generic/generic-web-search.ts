/**
 * GenericWebSearch Tool (Ultimate Fallback)
 * 
 * This tool is used when NO specialized tool is available for a task.
 * It searches Google via Serper and uses LLM to extract the answer.
 * 
 * Use cases:
 * - Fields with no dedicated tool
 * - Unusual queries
 * - Last resort when all else fails
 * 
 * RULES:
 * - Only return results with confidence ≥ 0.5
 * - Never hallucinate - only extract from search results
 * - Be honest about uncertainty
 * - Prefer returning null over guessing
 */

import { logger } from "@trigger.dev/sdk";
import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

// ============================================================
// TYPES
// ============================================================

export interface GenericWebSearchResult {
    value: string | null;
    confidence: number;
    source: "web_search" | "not_found";
    searchQuery: string;
    snippetsUsed: number;
    reason?: string;
}

interface SearchResult {
    title: string;
    snippet: string;
    url: string;
    position: number;
}

// ============================================================
// SERPER SEARCH
// ============================================================

/**
 * Perform Serper search
 */
async function serperSearch(query: string): Promise<{
    organic: SearchResult[];
    knowledgeGraph?: {
        title?: string;
        type?: string;
        description?: string;
        attributes?: Record<string, string>;
    };
}> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        logger.warn("⚠️ GenericWebSearch: SERPER_API_KEY not configured");
        return { organic: [] };
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
            return { organic: [] };
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

        return {
            organic: results,
            knowledgeGraph: data.knowledgeGraph,
        };
    } catch (error) {
        logger.error("❌ Serper search failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return { organic: [] };
    }
}

// ============================================================
// BUILD SEARCH QUERY
// ============================================================

/**
 * Build an effective search query for the target field
 */
function buildSearchQuery(
    targetField: string,
    context: Record<string, unknown>
): string {
    // Get available context values
    const name = (context.name || context.full_name || context.company_name || context.company) as string | undefined;
    const domain = (context.domain || context.website) as string | undefined;
    const company = (context.company || context.company_name) as string | undefined;

    // Normalize field name to human-readable
    const fieldMap: Record<string, string> = {
        bio: "biography about",
        twitter: "twitter",
        github: "github",
        email: "email",
        phone: "phone number",
        founded: "founded year",
        foundedDate: "founded year",
        industry: "industry",
        location: "location headquarters",
        employeeCount: "employee count",
        companySize: "company size employees",
        revenue: "revenue",
        funding: "funding raised",
        description: "description about",
        title: "job title",
        linkedin: "linkedin",
        website: "website",
    };

    const fieldQuery = fieldMap[targetField] || targetField;

    // Build query based on available context
    const parts: string[] = [];

    if (name) {
        parts.push(`"${name}"`);
    }

    if (domain && !name) {
        // Use domain as fallback identifier
        parts.push(domain.replace(/^https?:\/\//, "").replace(/\/$/, ""));
    }

    if (company && company !== name) {
        parts.push(`"${company}"`);
    }

    parts.push(fieldQuery);

    return parts.join(" ");
}

// ============================================================
// LLM EXTRACTION
// ============================================================

const ExtractionSchema = z.object({
    value: z.string().nullable().describe("The extracted value for the target field, or null if not found"),
    confidence: z.number().min(0).max(1).describe("Confidence in the extracted value (0-1)"),
    source: z.string().nullable().describe("Which snippet/source provided the information"),
    reasoning: z.string().describe("Brief explanation of how the value was determined"),
});

type Extraction = z.infer<typeof ExtractionSchema>;

/**
 * Extract target field value from search results using LLM
 */
async function extractFromSearchResults(
    searchResults: SearchResult[],
    knowledgeGraph: { title?: string; type?: string; description?: string; attributes?: Record<string, string>; } | undefined,
    targetField: string,
    context: Record<string, unknown>
): Promise<Extraction | null> {
    if (searchResults.length === 0 && !knowledgeGraph) {
        return null;
    }

    // Build context from search results
    const snippetContext = searchResults
        .slice(0, 8)
        .map((r, i) => `[${i + 1}] Title: ${r.title}\n    Snippet: ${r.snippet}\n    URL: ${r.url}`)
        .join("\n\n");

    // Include knowledge graph if available
    let kgContext = "";
    if (knowledgeGraph) {
        kgContext = "\n\nKnowledge Graph:";
        if (knowledgeGraph.title) kgContext += `\n  Title: ${knowledgeGraph.title}`;
        if (knowledgeGraph.type) kgContext += `\n  Type: ${knowledgeGraph.type}`;
        if (knowledgeGraph.description) kgContext += `\n  Description: ${knowledgeGraph.description}`;
        if (knowledgeGraph.attributes) {
            for (const [key, val] of Object.entries(knowledgeGraph.attributes)) {
                kgContext += `\n  ${key}: ${val}`;
            }
        }
    }

    // Build context string from known data
    const contextStr = Object.entries(context)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

    const systemPrompt = `You are extracting specific information from Google search results.

RULES - CRITICAL:
1. ONLY extract information that is EXPLICITLY stated in the search results
2. Do NOT use outside knowledge
3. Do NOT guess or infer
4. If the information is not clearly present, return null
5. Be conservative with confidence scores
6. Prefer returning null over guessing

CONFIDENCE SCORING:
- 0.9-1.0: Explicitly stated in multiple sources
- 0.7-0.9: Clearly stated in one reliable source
- 0.5-0.7: Mentioned but needs interpretation
- 0.3-0.5: Weak signal, uncertain
- 0.0-0.3: Not found or unreliable`;

    const userPrompt = `Extract the value for "${targetField}" from these search results.

Context: ${contextStr || "No additional context"}

Search Results:
${snippetContext}
${kgContext}

Extract the ${targetField} value. Return null if not clearly found.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: ExtractionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        logger.info("✅ GenericWebSearch: Extraction complete", {
            targetField,
            value: result.object.value,
            confidence: result.object.confidence,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ GenericWebSearch: Extraction failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Generic web search fallback tool
 * 
 * Use when no specialized tool is available for the target field.
 * Searches Google and uses LLM to extract the answer.
 * 
 * @param targetField - The field to find (e.g., "industry", "founded", "twitter")
 * @param context - Known data about the entity (name, domain, company, etc.)
 * @param customQuery - Optional custom search query (overrides auto-generated)
 */
export async function genericWebSearch(
    targetField: string,
    context: Record<string, unknown>,
    customQuery?: string
): Promise<GenericWebSearchResult> {
    logger.info("🔍 GenericWebSearch: Starting", {
        targetField,
        contextKeys: Object.keys(context),
        hasCustomQuery: !!customQuery,
    });

    // Validate we have some context
    const hasContext = Object.values(context).some(v => v !== undefined && v !== null && v !== "");
    if (!hasContext && !customQuery) {
        logger.warn("⚠️ GenericWebSearch: No context or custom query provided");
        return {
            value: null,
            confidence: 0,
            source: "not_found",
            searchQuery: "",
            snippetsUsed: 0,
            reason: "No context provided to build search query",
        };
    }

    // Build or use custom search query
    const searchQuery = customQuery || buildSearchQuery(targetField, context);
    logger.info("🔍 GenericWebSearch: Searching", { query: searchQuery });

    // Perform search
    const searchResults = await serperSearch(searchQuery);

    if (searchResults.organic.length === 0 && !searchResults.knowledgeGraph) {
        logger.info("⚠️ GenericWebSearch: No search results");
        return {
            value: null,
            confidence: 0,
            source: "not_found",
            searchQuery,
            snippetsUsed: 0,
            reason: "No search results found",
        };
    }

    logger.info("📊 GenericWebSearch: Got results", {
        organicCount: searchResults.organic.length,
        hasKnowledgeGraph: !!searchResults.knowledgeGraph,
    });

    // Extract value using LLM
    const extraction = await extractFromSearchResults(
        searchResults.organic,
        searchResults.knowledgeGraph,
        targetField,
        context
    );

    if (!extraction) {
        return {
            value: null,
            confidence: 0,
            source: "not_found",
            searchQuery,
            snippetsUsed: searchResults.organic.length,
            reason: "LLM extraction failed",
        };
    }

    // Apply confidence threshold
    const CONFIDENCE_THRESHOLD = 0.5;

    if (extraction.confidence < CONFIDENCE_THRESHOLD) {
        logger.info("⚠️ GenericWebSearch: Confidence below threshold", {
            confidence: extraction.confidence,
            threshold: CONFIDENCE_THRESHOLD,
            value: extraction.value,
        });

        return {
            value: null,  // Don't return low-confidence results
            confidence: extraction.confidence,
            source: "not_found",
            searchQuery,
            snippetsUsed: searchResults.organic.length,
            reason: `Confidence too low: ${(extraction.confidence * 100).toFixed(0)}% < ${CONFIDENCE_THRESHOLD * 100}% threshold. ${extraction.reasoning}`,
        };
    }

    // Return successful result
    logger.info("✅ GenericWebSearch: Success", {
        targetField,
        value: extraction.value,
        confidence: extraction.confidence,
    });

    return {
        value: extraction.value,
        confidence: extraction.confidence,
        source: "web_search",
        searchQuery,
        snippetsUsed: searchResults.organic.length,
        reason: extraction.reasoning,
    };
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * GenericWebSearch Provider for integration with enrichment system
 */
export class GenericWebSearchProvider {
    name = "generic_web_search";
    tier = "cheap" as const;
    costCents = 1; // Serper + LLM

    async enrich(
        targetField: string,
        context: Record<string, unknown>,
        customQuery?: string
    ): Promise<GenericWebSearchResult> {
        return genericWebSearch(targetField, context, customQuery);
    }
}

// Export singleton
export const genericWebSearchProvider = new GenericWebSearchProvider();
