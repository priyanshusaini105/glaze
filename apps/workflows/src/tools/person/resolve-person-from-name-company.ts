/**
 * ResolvePersonFromNameCompany Tool
 * 
 * Main person resolution pipeline.
 * 
 * Input: name + company
 * Output: Full person profile (name, title, company, location, linkedinUrl)
 * 
 * Pipeline:
 * 1. FindLinkedInProfile → get identity anchor
 * 2. If found: ResolvePersonFromLinkedIn → extract profile data
 * 3. If not found: Return partial/ambiguous result
 * 
 * "Given a person's name and company, first search Google to find the most 
 * likely LinkedIn profile for that person and select the best matching URL. 
 * Use this LinkedIn URL as the identity anchor. Then extract name, title, 
 * company, and location primarily from Google titles and snippets, and only 
 * if insufficient, scrape a single non-LinkedIn authoritative page to fill 
 * missing fields. Do not scrape LinkedIn directly, do not infer missing data, 
 * and return partial results with a confidence score."
 */

import { logger } from "@trigger.dev/sdk";
import { findLinkedInProfile } from "./find-linkedin-profile";
import { resolvePersonFromLinkedIn, type PersonProfile } from "./resolve-person-from-linkedin";

// ============================================================
// TYPES
// ============================================================

export interface ResolvePersonFromNameCompanyResult extends PersonProfile {
    /** Whether LinkedIn was found and used as anchor */
    linkedinAnchored: boolean;
    /** Confidence from LinkedIn resolution (if applicable) */
    linkedinResolutionConfidence: number;
    /** Overall resolution status */
    resolutionStatus: "anchored" | "ambiguous" | "not_found";
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Resolve person profile from name + company
 * 
 * Two-phase pipeline:
 * 1. Find the best LinkedIn profile (identity anchor)
 * 2. Extract info using snippet-first + fallback logic
 */
export async function resolvePersonFromNameCompany(
    name: string,
    company: string
): Promise<ResolvePersonFromNameCompanyResult> {
    logger.info("🔍 ResolvePersonFromNameCompany: Starting", { name, company });

    // Validate inputs
    if (!name) {
        logger.warn("⚠️ ResolvePersonFromNameCompany: Missing name");
        return {
            name: null,
            title: null,
            company: company || null,
            location: null,
            linkedinUrl: null,
            confidence: 0,
            source: "failed",
            fieldsFromSnippets: [],
            fieldsFromScrape: [],
            linkedinAnchored: false,
            linkedinResolutionConfidence: 0,
            resolutionStatus: "not_found",
        };
    }

    // PHASE 1: Find LinkedIn profile (identity anchor)
    logger.info("📍 ResolvePersonFromNameCompany: Phase 1 - Finding LinkedIn profile");

    const linkedinResult = await findLinkedInProfile(name, company || "");

    if (!linkedinResult.linkedinUrl || linkedinResult.confidence < 0.5) {
        // LinkedIn not found - return ambiguous result
        logger.info("⚠️ ResolvePersonFromNameCompany: LinkedIn not found, returning ambiguous", {
            candidatesFound: linkedinResult.candidatesFound,
            reason: linkedinResult.matchReason,
        });

        // Try to do basic enrichment without LinkedIn anchor
        // This is lower quality but better than nothing
        const fallbackResult = await resolvePersonFromLinkedIn({
            name,
            company,
        });

        return {
            ...fallbackResult,
            linkedinAnchored: false,
            linkedinResolutionConfidence: linkedinResult.confidence,
            resolutionStatus: linkedinResult.candidatesFound > 0 ? "ambiguous" : "not_found",
        };
    }

    // PHASE 2: Extract profile data using LinkedIn URL as anchor
    logger.info("📍 ResolvePersonFromNameCompany: Phase 2 - Extracting profile data", {
        linkedinUrl: linkedinResult.linkedinUrl,
        anchorConfidence: linkedinResult.confidence,
    });

    const profileResult = await resolvePersonFromLinkedIn({
        linkedinUrl: linkedinResult.linkedinUrl,
        name, // Pass original name for context
        company, // Pass original company for context
    });

    // Combine confidences
    // Final confidence = LinkedIn resolution confidence * profile extraction confidence
    const combinedConfidence = linkedinResult.confidence * 0.4 + profileResult.confidence * 0.6;

    const result: ResolvePersonFromNameCompanyResult = {
        name: profileResult.name || name,
        title: profileResult.title,
        company: profileResult.company || company,
        location: profileResult.location,
        linkedinUrl: linkedinResult.linkedinUrl,
        confidence: Math.min(0.95, combinedConfidence),
        source: profileResult.source,
        fieldsFromSnippets: profileResult.fieldsFromSnippets,
        fieldsFromScrape: profileResult.fieldsFromScrape,
        linkedinAnchored: true,
        linkedinResolutionConfidence: linkedinResult.confidence,
        resolutionStatus: "anchored",
    };

    logger.info("✅ ResolvePersonFromNameCompany: Complete", {
        name: result.name,
        title: result.title,
        company: result.company,
        location: result.location,
        confidence: result.confidence,
        resolutionStatus: result.resolutionStatus,
        linkedinAnchored: result.linkedinAnchored,
    });

    return result;
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * ResolvePersonFromNameCompany Provider for integration with enrichment system
 */
export class ResolvePersonFromNameCompanyProvider {
    name = "resolve_person_from_name_company";
    tier = "cheap" as const;
    costCents = 3; // FindLinkedInProfile (1) + ResolvePersonFromLinkedIn (2)

    async enrich(name: string, company: string): Promise<ResolvePersonFromNameCompanyResult> {
        return resolvePersonFromNameCompany(name, company);
    }
}

// Export singleton
export const resolvePersonFromNameCompanyProvider = new ResolvePersonFromNameCompanyProvider();
