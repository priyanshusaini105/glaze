/**
 * EstimateCompanySize Tool
 * 
 * LinkedIn-first company size estimation.
 * 
 * Input: domain (or company name)
 * Output: employeeCountRange, hiringStatus, linkedinCompanyUrl, confidence
 * 
 * Pipeline:
 * 1. Resolve LinkedIn company URL (via Serper)
 * 2. Scrape LinkedIn company page (via Serper cache/snippet)
 * 3. Extract structured data (employee count, hiring)
 * 4. Normalize to standard buckets
 * 5. Score confidence
 * 
 * Why LinkedIn-first:
 * - Employee count ranges for free
 * - Hiring indicators
 * - Company name normalization
 * - Industry tags
 * - 80% of what we need in one place
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

/**
 * Standard employee count ranges (matching LinkedIn's buckets)
 */
export type EmployeeCountRange =
    | "1-10"
    | "11-50"
    | "51-200"
    | "201-500"
    | "501-1000"
    | "1001-5000"
    | "5001-10000"
    | "10001+"
    | "unknown";

/**
 * Hiring status
 */
export type HiringStatus =
    | "actively_hiring"
    | "occasionally_hiring"
    | "not_hiring"
    | "unknown";

/**
 * Result from EstimateCompanySize
 */
export interface CompanySizeResult {
    employeeCountRange: EmployeeCountRange;
    hiringStatus: HiringStatus;
    linkedinCompanyUrl: string | null;
    companyName: string | null;
    industry: string | null;
    location: string | null;
    confidence: number;
    source: "linkedin" | "inferred" | "unknown";
    reason?: string;
}

// ============================================================
// STEP 1: RESOLVE LINKEDIN COMPANY URL
// ============================================================

interface LinkedInResolutionResult {
    url: string | null;
    confidence: number;
    method: "direct_search" | "site_search" | "inferred";
    snippetData?: string;
}

/**
 * Perform Serper search
 */
async function serperSearch(query: string): Promise<{
    organic: Array<{
        title: string;
        link: string;
        snippet: string;
        position: number;
    }>;
    knowledgeGraph?: {
        title?: string;
        type?: string;
        description?: string;
        attributes?: Record<string, string>;
    };
} | null> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        logger.warn("⚠️ EstimateCompanySize: SERPER_API_KEY not configured");
        return null;
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
            return null;
        }

        return await response.json();
    } catch (error) {
        logger.error("❌ Serper search failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

/**
 * Validate LinkedIn company URL format
 */
function isValidLinkedInCompanyUrl(url: string): boolean {
    // Must be linkedin.com/company/
    if (!url.includes("linkedin.com/company/")) return false;

    // Must not be subpages
    const rejectPatterns = [
        /\/school\//i,
        /\/showcase\//i,
        /\/jobs\//i,
        /\/posts\//i,
        /\/people\//i,
        /\/about\//i,
        /\/life\//i,
    ];

    for (const pattern of rejectPatterns) {
        if (pattern.test(url)) return false;
    }

    // Extract the slug and validate it looks like a company
    const match = url.match(/linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/);
    if (!match || !match[1]) return false;

    const slug = match[1];

    // Slug should be reasonable length and not just numbers
    if (slug.length < 2 || slug.length > 100) return false;
    if (/^\d+$/.test(slug)) return false; // Just numbers is suspicious

    return true;
}

/**
 * Extract LinkedIn company slug from URL
 */
function extractLinkedInSlug(url: string): string | null {
    const match = url.match(/linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/);
    return match ? match[1] || null : null;
}

/**
 * Resolve LinkedIn company URL using multiple query strategies
 */
async function resolveLinkedInCompanyUrl(
    domain: string,
    companyName?: string
): Promise<LinkedInResolutionResult> {
    logger.info("🔍 EstimateCompanySize: Resolving LinkedIn URL", {
        domain,
        companyName,
    });

    // Extract clean company name from domain if not provided
    const inferredName = companyName || domain.replace(/\.(com|io|co|org|net|app)$/i, "");

    // Query strategies in order of reliability
    const queries = [
        `site:linkedin.com/company "${domain}"`,
        `site:linkedin.com/company "${inferredName}"`,
        `"${domain}" LinkedIn company`,
        `"${inferredName}" LinkedIn company page`,
    ];

    let bestMatch: { url: string; confidence: number; snippet: string } | null = null;

    for (const query of queries) {
        const results = await serperSearch(query);
        if (!results?.organic) continue;

        for (const result of results.organic) {
            if (!isValidLinkedInCompanyUrl(result.link)) continue;

            // Calculate match score
            let score = 0.5; // Base score for valid LinkedIn company URL

            // Position bonus (first result = higher confidence)
            if (result.position <= 1) score += 0.25;
            else if (result.position <= 3) score += 0.15;
            else if (result.position <= 5) score += 0.05;

            // Domain/name in title or snippet
            const lowerTitle = result.title.toLowerCase();
            const lowerSnippet = result.snippet.toLowerCase();
            const lowerDomain = domain.toLowerCase().replace(/\.(com|io|co|org|net|app)$/i, "");
            const lowerName = inferredName.toLowerCase();

            if (lowerTitle.includes(lowerDomain) || lowerTitle.includes(lowerName)) {
                score += 0.15;
            }
            if (lowerSnippet.includes(lowerDomain) || lowerSnippet.includes(lowerName)) {
                score += 0.1;
            }

            // Slug matches company name
            const slug = extractLinkedInSlug(result.link);
            if (slug) {
                const normalizedSlug = slug.toLowerCase().replace(/[^a-z0-9]/g, "");
                const normalizedName = lowerName.replace(/[^a-z0-9]/g, "");
                if (normalizedSlug === normalizedName) {
                    score += 0.2;
                } else if (normalizedSlug.includes(normalizedName) || normalizedName.includes(normalizedSlug)) {
                    score += 0.1;
                }
            }

            // Cap at 0.95
            score = Math.min(0.95, score);

            // Keep best match
            if (!bestMatch || score > bestMatch.confidence) {
                bestMatch = {
                    url: result.link,
                    confidence: score,
                    snippet: result.snippet,
                };
            }

            // If we have high confidence, stop searching
            if (score >= 0.85) break;
        }

        // If we have high confidence, stop trying more queries
        if (bestMatch && bestMatch.confidence >= 0.85) break;
    }

    if (!bestMatch) {
        logger.info("⚠️ EstimateCompanySize: No LinkedIn URL found", { domain });
        return {
            url: null,
            confidence: 0,
            method: "direct_search",
        };
    }

    logger.info("✅ EstimateCompanySize: LinkedIn URL resolved", {
        url: bestMatch.url,
        confidence: bestMatch.confidence,
    });

    return {
        url: bestMatch.url,
        confidence: bestMatch.confidence,
        method: "site_search",
        snippetData: bestMatch.snippet,
    };
}

// ============================================================
// STEP 2 & 3: SCRAPE AND EXTRACT LINKEDIN DATA
// ============================================================

/**
 * Schema for LLM extraction
 */
const LinkedInDataSchema = z.object({
    companyName: z.string().nullable().describe("Official company name from LinkedIn"),
    employeeCount: z.string().nullable().describe("Employee count text (e.g., '51-200 employees', '1,001-5,000')"),
    industry: z.string().nullable().describe("Company industry/sector"),
    location: z.string().nullable().describe("Company headquarters location"),
    hasJobsSection: z.boolean().describe("Whether the page indicates job listings"),
    isActivelyHiring: z.boolean().describe("Whether there are signs of active hiring"),
    confidence: z.number().min(0).max(1).describe("Confidence in extracted data"),
});

type LinkedInData = z.infer<typeof LinkedInDataSchema>;

/**
 * Get more data about the LinkedIn company page via search
 */
async function getLinkedInPageData(
    linkedinUrl: string,
    domain: string,
    existingSnippet?: string
): Promise<LinkedInData | null> {
    // Search for more context about this LinkedIn page
    const queries = [
        `site:linkedin.com "${extractLinkedInSlug(linkedinUrl)}" employees`,
        `"${linkedinUrl}" company size employees`,
    ];

    const allSnippets: string[] = [];
    if (existingSnippet) allSnippets.push(existingSnippet);

    for (const query of queries) {
        const results = await serperSearch(query);
        if (results?.organic) {
            for (const result of results.organic.slice(0, 3)) {
                if (result.snippet) allSnippets.push(result.snippet);
                if (result.title) allSnippets.push(result.title);
            }
        }
        if (results?.knowledgeGraph) {
            if (results.knowledgeGraph.description) {
                allSnippets.push(results.knowledgeGraph.description);
            }
            if (results.knowledgeGraph.attributes) {
                for (const [key, value] of Object.entries(results.knowledgeGraph.attributes)) {
                    allSnippets.push(`${key}: ${value}`);
                }
            }
        }
    }

    if (allSnippets.length === 0) {
        logger.warn("⚠️ EstimateCompanySize: No snippets found for LinkedIn page");
        return null;
    }

    // Use LLM to extract structured data from snippets
    const combinedText = allSnippets.join("\n\n");

    const systemPrompt = `You are extracting company information from LinkedIn search results and snippets.

RULES:
1. Only extract information explicitly stated in the text
2. For employee count, look for patterns like "X-Y employees", "X employees", "X+ employees"
3. Common LinkedIn employee ranges: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10001+
4. For hiring status, look for "jobs", "hiring", "open positions", "careers"
5. If information is not clearly stated, return null
6. Set confidence based on how clearly the data appears in the text`;

    const userPrompt = `Extract company information from these LinkedIn search results about ${domain}:

LinkedIn URL: ${linkedinUrl}

Search Results/Snippets:
${combinedText}

Extract: company name, employee count, industry, location, hiring indicators.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: LinkedInDataSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        logger.info("✅ EstimateCompanySize: LinkedIn data extracted", {
            companyName: result.object.companyName,
            employeeCount: result.object.employeeCount,
            confidence: result.object.confidence,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ EstimateCompanySize: LLM extraction failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// STEP 4: NORMALIZE EMPLOYEE COUNT
// ============================================================

/**
 * Normalize employee count text to standard range
 */
function normalizeEmployeeCount(countText: string | null): EmployeeCountRange {
    if (!countText) return "unknown";

    const text = countText.toLowerCase().replace(/,/g, "");

    // Direct range matches
    const rangePatterns: [RegExp, EmployeeCountRange][] = [
        [/\b1\s*[-–]\s*10\b/, "1-10"],
        [/\b11\s*[-–]\s*50\b/, "11-50"],
        [/\b51\s*[-–]\s*200\b/, "51-200"],
        [/\b201\s*[-–]\s*500\b/, "201-500"],
        [/\b501\s*[-–]\s*1000\b/, "501-1000"],
        [/\b1001\s*[-–]\s*5000\b/, "1001-5000"],
        [/\b5001\s*[-–]\s*10000\b/, "5001-10000"],
        [/\b10001\s*\+?/, "10001+"],
        [/\b10000\s*\+/, "10001+"],
    ];

    for (const [pattern, range] of rangePatterns) {
        if (pattern.test(text)) return range;
    }

    // Try to extract numbers and infer range
    const numberMatch = text.match(/(\d+)/);
    if (numberMatch && numberMatch[1]) {
        const num = parseInt(numberMatch[1], 10);
        if (num <= 10) return "1-10";
        if (num <= 50) return "11-50";
        if (num <= 200) return "51-200";
        if (num <= 500) return "201-500";
        if (num <= 1000) return "501-1000";
        if (num <= 5000) return "1001-5000";
        if (num <= 10000) return "5001-10000";
        return "10001+";
    }

    return "unknown";
}

// ============================================================
// STEP 5: DETERMINE HIRING STATUS
// ============================================================

/**
 * Determine hiring status from LinkedIn data
 */
function determineHiringStatus(data: LinkedInData | null): HiringStatus {
    if (!data) return "unknown";

    if (data.isActivelyHiring && data.hasJobsSection) {
        return "actively_hiring";
    }

    if (data.hasJobsSection) {
        return "occasionally_hiring";
    }

    if (data.isActivelyHiring) {
        return "occasionally_hiring";
    }

    // If we have data but no hiring signals, assume not hiring
    if (data.companyName || data.employeeCount) {
        return "not_hiring";
    }

    return "unknown";
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Estimate company size using LinkedIn as primary source
 */
export async function estimateCompanySize(
    domain: string,
    companyName?: string
): Promise<CompanySizeResult> {
    logger.info("📊 EstimateCompanySize: Starting", { domain, companyName });

    // Clean domain
    const cleanDomain = domain
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "")
        .toLowerCase();

    // Step 1: Resolve LinkedIn company URL
    const linkedInResolution = await resolveLinkedInCompanyUrl(cleanDomain, companyName);

    if (!linkedInResolution.url || linkedInResolution.confidence < 0.6) {
        logger.warn("⚠️ EstimateCompanySize: Could not resolve LinkedIn URL with high confidence", {
            domain: cleanDomain,
            confidence: linkedInResolution.confidence,
        });

        return {
            employeeCountRange: "unknown",
            hiringStatus: "unknown",
            linkedinCompanyUrl: linkedInResolution.url,
            companyName: null,
            industry: null,
            location: null,
            confidence: linkedInResolution.confidence,
            source: "unknown",
            reason: `LinkedIn URL resolution confidence too low: ${linkedInResolution.confidence.toFixed(2)}`,
        };
    }

    // Step 2 & 3: Get LinkedIn page data
    const linkedInData = await getLinkedInPageData(
        linkedInResolution.url,
        cleanDomain,
        linkedInResolution.snippetData
    );

    if (!linkedInData) {
        return {
            employeeCountRange: "unknown",
            hiringStatus: "unknown",
            linkedinCompanyUrl: linkedInResolution.url,
            companyName: null,
            industry: null,
            location: null,
            confidence: 0.4,
            source: "inferred",
            reason: "Could not extract data from LinkedIn page",
        };
    }

    // Step 4: Normalize employee count
    const employeeCountRange = normalizeEmployeeCount(linkedInData.employeeCount);

    // Step 5: Determine hiring status
    const hiringStatus = determineHiringStatus(linkedInData);

    // Calculate final confidence
    let confidence = linkedInResolution.confidence * 0.5 + linkedInData.confidence * 0.5;
    if (employeeCountRange === "unknown") {
        confidence *= 0.7; // Penalty for unknown employee count
    }
    confidence = Math.min(0.95, Math.max(0.1, confidence));

    const result: CompanySizeResult = {
        employeeCountRange,
        hiringStatus,
        linkedinCompanyUrl: linkedInResolution.url,
        companyName: linkedInData.companyName,
        industry: linkedInData.industry,
        location: linkedInData.location,
        confidence,
        source: "linkedin",
    };

    logger.info("✅ EstimateCompanySize: Complete", {
        domain: cleanDomain,
        employeeCountRange,
        hiringStatus,
        confidence,
        linkedinUrl: linkedInResolution.url,
    });

    return result;
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * EstimateCompanySize Provider for integration with enrichment system
 */
export class EstimateCompanySizeProvider {
    name = "estimate_company_size";
    tier = "cheap" as const;
    costCents = 2; // Serper + LLM costs

    async enrich(domain: string, companyName?: string): Promise<CompanySizeResult> {
        return estimateCompanySize(domain, companyName);
    }
}

// Export singleton
export const estimateCompanySizeProvider = new EstimateCompanySizeProvider();
