/**
 * FindLinkedInProfile Tool (MVP-critical)
 * 
 * Pure identity resolution tool.
 * 
 * Input: name + company
 * Output: linkedinUrl | null + confidence
 * 
 * This tool does NOT extract person info.
 * It only answers: "Which LinkedIn profile, if any, matches this person?"
 * 
 * LinkedIn becomes the PRIMARY IDENTITY ANCHOR.
 * 
 * Pipeline:
 * 1. Google search for LinkedIn profiles
 * 2. LLM picks the best matching URL
 * 3. Lightweight confidence scoring
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

export interface FindLinkedInProfileResult {
    linkedinUrl: string | null;
    confidence: number;
    candidatesFound: number;
    matchReason: string | null;
}

interface SearchResult {
    title: string;
    snippet: string;
    url: string;
    position: number;
}

// ============================================================
// STEP 1: GOOGLE SEARCH
// ============================================================

/**
 * Perform Serper search
 */
async function serperSearch(query: string): Promise<SearchResult[]> {
    const apiKey = process.env.SERPER_API_KEY;
    if (!apiKey) {
        logger.warn("⚠️ FindLinkedInProfile: SERPER_API_KEY not configured");
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
 * Check if URL is a valid LinkedIn profile URL
 */
function isLinkedInProfileUrl(url: string): boolean {
    return url.includes("linkedin.com/in/");
}

/**
 * Filter search results to only LinkedIn profile URLs
 */
function filterLinkedInProfiles(results: SearchResult[]): SearchResult[] {
    return results.filter(r => isLinkedInProfileUrl(r.url));
}

// ============================================================
// STEP 2: LLM PICKS BEST URL
// ============================================================

const ProfileSelectionSchema = z.object({
    selectedUrl: z.string().nullable().describe("The LinkedIn profile URL that best matches, or null if none reliable"),
    matchReason: z.string().describe("Why this profile was selected, or why none were selected"),
    nameMatch: z.boolean().describe("Does the name in the result match the search name?"),
    companyMatch: z.boolean().describe("Is the company mentioned in title/snippet?"),
    titlePresent: z.boolean().describe("Is a job title visible in the result?"),
    confidence: z.number().min(0).max(1).describe("Confidence that this is the correct person"),
});

type ProfileSelection = z.infer<typeof ProfileSelectionSchema>;

/**
 * Use LLM to select the best matching LinkedIn profile
 */
async function selectBestProfile(
    candidates: SearchResult[],
    name: string,
    company: string
): Promise<ProfileSelection | null> {
    if (candidates.length === 0) {
        return null;
    }

    const candidateList = candidates.map((r, i) =>
        `[${i + 1}] URL: ${r.url}\n    Title: ${r.title}\n    Snippet: ${r.snippet}`
    ).join("\n\n");

    const systemPrompt = `You are selecting the best LinkedIn profile match for a person.

RULES:
1. Choose the profile that most likely belongs to the person with the given name and company
2. Name match is CRITICAL - the profile must have a similar name
3. Company match is strong signal - look for it in title or snippet
4. Do NOT guess - if uncertain, return null
5. If multiple profiles could match, pick the one with most signals or return null

CONFIDENCE SCORING:
- Exact name match: +0.4
- Company mentioned: +0.3
- Job title present: +0.2
- First result position: +0.1`;

    const userPrompt = `Find the LinkedIn profile for: ${name} at ${company}

Candidates:
${candidateList}

Select the best matching URL, or null if none are reliable.`;

    try {
        const result = await generateObject({
            model: groq("llama-3.3-70b-versatile"),
            schema: ProfileSelectionSchema,
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.1,
        });

        logger.info("✅ FindLinkedInProfile: LLM selection complete", {
            selectedUrl: result.object.selectedUrl,
            confidence: result.object.confidence,
            reason: result.object.matchReason,
        });

        return result.object;
    } catch (error) {
        logger.error("❌ FindLinkedInProfile: LLM selection failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// STEP 3: CONFIDENCE SCORING (FALLBACK/VALIDATION)
// ============================================================

/**
 * Calculate confidence score based on match signals
 * Used when LLM gives us the signals
 */
function calculateConfidence(
    selection: ProfileSelection,
    position: number
): number {
    let confidence = 0;

    if (selection.nameMatch) confidence += 0.4;
    if (selection.companyMatch) confidence += 0.3;
    if (selection.titlePresent) confidence += 0.2;
    if (position <= 1) confidence += 0.1;

    // Use LLM's confidence as a modifier
    const llmConfidence = selection.confidence;

    // Blend: 60% calculated, 40% LLM
    confidence = confidence * 0.6 + llmConfidence * 0.4;

    return Math.min(1.0, confidence);
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Find the LinkedIn profile URL for a person given name + company
 * 
 * Returns only the URL and confidence - does NOT extract profile data
 */
export async function findLinkedInProfile(
    name: string,
    company: string
): Promise<FindLinkedInProfileResult> {
    logger.info("🔍 FindLinkedInProfile: Starting", { name, company });

    // Validate inputs
    if (!name || !company) {
        logger.warn("⚠️ FindLinkedInProfile: Missing name or company");
        return {
            linkedinUrl: null,
            confidence: 0,
            candidatesFound: 0,
            matchReason: "Missing required inputs (name and company)",
        };
    }

    // STEP 1: Google search for LinkedIn profiles
    const query = `"${name}" "${company}" site:linkedin.com/in`;
    logger.info("🔍 FindLinkedInProfile: Searching", { query });

    const allResults = await serperSearch(query);
    const linkedInResults = filterLinkedInProfiles(allResults);

    logger.info("📊 FindLinkedInProfile: Search complete", {
        totalResults: allResults.length,
        linkedInProfiles: linkedInResults.length,
    });

    if (linkedInResults.length === 0) {
        // Try alternative query
        const altQuery = `"${name}" "${company}" LinkedIn`;
        const altResults = await serperSearch(altQuery);
        const altLinkedIn = filterLinkedInProfiles(altResults);

        if (altLinkedIn.length === 0) {
            logger.info("⚠️ FindLinkedInProfile: No LinkedIn profiles found");
            return {
                linkedinUrl: null,
                confidence: 0,
                candidatesFound: 0,
                matchReason: "No LinkedIn profiles found in search results",
            };
        }

        linkedInResults.push(...altLinkedIn);
    }

    // STEP 2: LLM picks best URL
    const selection = await selectBestProfile(linkedInResults.slice(0, 5), name, company);

    if (!selection || !selection.selectedUrl) {
        return {
            linkedinUrl: null,
            confidence: 0,
            candidatesFound: linkedInResults.length,
            matchReason: selection?.matchReason || "LLM could not identify a reliable match",
        };
    }

    // Find position of selected URL
    const selectedResult = linkedInResults.find(r => r.url === selection.selectedUrl);
    const position = selectedResult?.position || 5;

    // STEP 3: Calculate final confidence
    const confidence = calculateConfidence(selection, position);

    // Apply threshold
    if (confidence < 0.5) {
        logger.info("⚠️ FindLinkedInProfile: Confidence below threshold", {
            confidence,
            threshold: 0.5,
        });
        return {
            linkedinUrl: null,
            confidence,
            candidatesFound: linkedInResults.length,
            matchReason: `Match found but confidence too low (${(confidence * 100).toFixed(0)}%)`,
        };
    }

    logger.info("✅ FindLinkedInProfile: Profile found", {
        linkedinUrl: selection.selectedUrl,
        confidence,
        matchReason: selection.matchReason,
    });

    return {
        linkedinUrl: selection.selectedUrl,
        confidence,
        candidatesFound: linkedInResults.length,
        matchReason: selection.matchReason,
    };
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * FindLinkedInProfile Provider for integration with enrichment system
 */
export class FindLinkedInProfileProvider {
    name = "find_linkedin_profile";
    tier = "cheap" as const;
    costCents = 1; // Just Serper + LLM

    async enrich(name: string, company: string): Promise<FindLinkedInProfileResult> {
        return findLinkedInProfile(name, company);
    }
}

// Export singleton
export const findLinkedInProfileProvider = new FindLinkedInProfileProvider();
