/**
 * GuessWorkEmail Tool (LinkedIn-First Strategy)
 * 
 * Finds professional email addresses using Prospeo with LinkedIn-first approach:
 * 1. If LinkedIn URL available → Prospeo Enrich Person (highest accuracy ~0.95)
 * 2. If no LinkedIn → Find LinkedIn first using search
 * 3. Fallback: Prospeo with name + company domain
 * 
 * Input: name + companyDomain + optional linkedinUrl
 * Output: email, confidence, source, verificationStatus
 * 
 * RULES:
 * - Never guess/hallucinate emails
 * - Use real API responses only
 * - LinkedIn URL = highest confidence
 * - Normalize confidence to 0-1
 * - Cache aggressively
 */

import { logger } from "@trigger.dev/sdk";
import {
    withCache,
    CACHE_TTL,
    buildWorkEmailCacheKey,
} from "@/cache";
import { findLinkedInProfile } from "./find-linkedin-profile";
import { enrichByLinkedIn, enrichByNameCompany } from "../providers/prospeo-enrich-person";

// ============================================================
// TYPES
// ============================================================

export interface GuessWorkEmailResult {
    email: string | null;
    confidence: number;
    source: "prospeo_linkedin" | "prospeo" | "not_found";
    verificationStatus: "valid" | "invalid" | "catch_all" | "unknown";
    firstName?: string;
    lastName?: string;
    linkedinUrl?: string;
    personName?: string;
    currentCompany?: string;
    currentJobTitle?: string;
    reason?: string;
}

// ============================================================
// HELPER: PARSE NAME
// ============================================================

/**
 * Split full name into first and last name
 */
function parseName(fullName: string): { firstName: string; lastName: string } {
    const parts = fullName.trim().split(/\s+/);

    if (parts.length === 1) {
        return { firstName: parts[0] || "", lastName: "" };
    }

    if (parts.length === 2) {
        return { firstName: parts[0] || "", lastName: parts[1] || "" };
    }

    // For names with 3+ parts, take first as firstName, rest as lastName
    const firstPart = parts[0] || "";
    return {
        firstName: firstPart,
        lastName: parts.slice(1).join(" "),
    };
}

/**
 * Clean domain (remove protocol, www, trailing slash)
 */
function cleanDomain(domain: string): string {
    return domain
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\/.*$/, "")
        .toLowerCase()
        .trim();
}

/**
 * Map Prospeo email status to our standard format
 */
function normalizeVerificationStatus(
    status?: string
): "valid" | "invalid" | "catch_all" | "unknown" {
    if (!status) return "unknown";

    const lower = status.toLowerCase();
    if (lower === "valid" || lower === "verified") return "valid";
    if (lower === "invalid") return "invalid";
    if (lower === "catch_all" || lower === "accept_all") return "catch_all";
    return "unknown";
}

// ============================================================
// MAIN FUNCTION (LINKEDIN-FIRST STRATEGY)
// ============================================================

/**
 * Internal uncached implementation of email discovery
 * 
 * Strategy:
 * 1. IF linkedinUrl provided → Prospeo Enrich Person (highest accuracy)
 * 2. ELSE → Try to find LinkedIn first, then enrich
 * 3. FALLBACK → Prospeo with name + domain
 */
async function guessWorkEmailInternal(
    name: string,
    companyDomain: string,
    linkedinUrl?: string
): Promise<GuessWorkEmailResult> {
    logger.info("📧 GuessWorkEmail: Starting (LinkedIn-first)", {
        name,
        companyDomain,
        hasLinkedIn: !!linkedinUrl,
    });

    // Validate inputs
    if (!name || !companyDomain) {
        logger.warn("⚠️ GuessWorkEmail: Missing required inputs");
        return {
            email: null,
            confidence: 0,
            source: "not_found",
            verificationStatus: "unknown",
            reason: "Missing name or company domain",
        };
    }

    // Parse name and clean domain
    const { firstName, lastName } = parseName(name);
    const domain = cleanDomain(companyDomain);

    if (!firstName) {
        logger.warn("⚠️ GuessWorkEmail: Could not parse name");
        return {
            email: null,
            confidence: 0,
            source: "not_found",
            verificationStatus: "unknown",
            reason: "Could not parse first name from input",
        };
    }

    // STEP 1: If LinkedIn URL provided, use it directly (highest accuracy)
    if (linkedinUrl) {
        logger.info("🔗 GuessWorkEmail: Using provided LinkedIn URL", { linkedinUrl });

        const result = await enrichByLinkedIn(linkedinUrl);

        if (result.success && result.email) {
            logger.info("✅ GuessWorkEmail: LinkedIn enrichment success", {
                email: result.email,
                confidence: result.confidence,
            });

            return {
                email: result.email,
                confidence: result.confidence,
                source: "prospeo_linkedin",
                verificationStatus: normalizeVerificationStatus(result.emailStatus),
                firstName,
                lastName: lastName || undefined,
                linkedinUrl: result.linkedinUrl,
                personName: result.personName,
                currentCompany: result.currentCompany,
                currentJobTitle: result.currentJobTitle,
            };
        }

        logger.info("⚠️ GuessWorkEmail: LinkedIn enrichment failed, trying fallback", {
            error: result.error,
        });
    }

    // STEP 2: Try to find LinkedIn profile if not provided
    if (!linkedinUrl) {
        logger.info("🔍 GuessWorkEmail: Attempting to find LinkedIn profile", { name, domain });

        try {
            const linkedInResult = await findLinkedInProfile(name, domain);

            if (linkedInResult.linkedinUrl && linkedInResult.confidence >= 0.5) {
                logger.info("✅ GuessWorkEmail: LinkedIn profile found", {
                    linkedinUrl: linkedInResult.linkedinUrl,
                    confidence: linkedInResult.confidence,
                });

                // Now enrich with the found LinkedIn URL
                const enrichResult = await enrichByLinkedIn(linkedInResult.linkedinUrl);

                if (enrichResult.success && enrichResult.email) {
                    logger.info("✅ GuessWorkEmail: LinkedIn enrichment success (auto-discovered)", {
                        email: enrichResult.email,
                        confidence: enrichResult.confidence,
                    });

                    // Slightly lower confidence since LinkedIn was auto-discovered
                    const adjustedConfidence = Math.min(
                        enrichResult.confidence,
                        linkedInResult.confidence * 0.9 + 0.1
                    );

                    return {
                        email: enrichResult.email,
                        confidence: adjustedConfidence,
                        source: "prospeo_linkedin",
                        verificationStatus: normalizeVerificationStatus(enrichResult.emailStatus),
                        firstName,
                        lastName: lastName || undefined,
                        linkedinUrl: enrichResult.linkedinUrl,
                        personName: enrichResult.personName,
                        currentCompany: enrichResult.currentCompany,
                        currentJobTitle: enrichResult.currentJobTitle,
                    };
                }
            }
        } catch (error) {
            logger.warn("⚠️ GuessWorkEmail: LinkedIn discovery failed", {
                error: error instanceof Error ? error.message : "Unknown",
            });
        }
    }

    // STEP 3: Fallback to Prospeo with name + company (lower accuracy)
    logger.info("🔄 GuessWorkEmail: Falling back to name+company enrichment", { name, domain });

    const fallbackResult = await enrichByNameCompany(name, domain);

    if (fallbackResult.success && fallbackResult.email) {
        logger.info("✅ GuessWorkEmail: Name+company enrichment success", {
            email: fallbackResult.email,
            confidence: fallbackResult.confidence,
        });

        return {
            email: fallbackResult.email,
            confidence: fallbackResult.confidence,
            source: "prospeo",
            verificationStatus: normalizeVerificationStatus(fallbackResult.emailStatus),
            firstName,
            lastName: lastName || undefined,
            linkedinUrl: fallbackResult.linkedinUrl,
            personName: fallbackResult.personName,
            currentCompany: fallbackResult.currentCompany,
            currentJobTitle: fallbackResult.currentJobTitle,
        };
    }

    // STEP 4: No email found
    logger.info("⚠️ GuessWorkEmail: No email found", { name, domain });

    return {
        email: null,
        confidence: 0,
        source: "not_found",
        verificationStatus: "unknown",
        firstName,
        lastName: lastName || undefined,
        reason: fallbackResult.error || "No email found via Prospeo",
    };
}

/**
 * Find work email using LinkedIn-first Prospeo strategy (CACHED)
 * 
 * @param name - Person's full name
 * @param companyDomain - Company domain/website
 * @param linkedinUrl - Optional LinkedIn URL (if available, use for highest accuracy)
 */
export async function guessWorkEmail(
    name: string,
    companyDomain: string,
    linkedinUrl?: string
): Promise<GuessWorkEmailResult> {
    // Include LinkedIn URL in cache key if provided
    const cacheKey = linkedinUrl
        ? `linkedin:${linkedinUrl}:${name}:${companyDomain}`
        : buildWorkEmailCacheKey(name, companyDomain);

    const result = await withCache<GuessWorkEmailResult>(
        cacheKey,
        async () => guessWorkEmailInternal(name, companyDomain, linkedinUrl),
        {
            ttl: CACHE_TTL.EMAIL_VERIFICATION, // 7 days
            keyPrefix: 'person',
            logLabel: 'GuessWorkEmail',
        }
    );

    if (!result) {
        logger.warn("⚠️ GuessWorkEmail: Cache returned null");
        return guessWorkEmailInternal(name, companyDomain, linkedinUrl);
    }

    return result;
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * GuessWorkEmail Provider for integration with enrichment system
 */
export class GuessWorkEmailProvider {
    name = "guess_work_email";
    tier = "cheap" as const;
    costCents = 1; // API credits are limited but we count as cheap

    async enrich(
        name: string,
        companyDomain: string,
        linkedinUrl?: string
    ): Promise<GuessWorkEmailResult> {
        return guessWorkEmail(name, companyDomain, linkedinUrl);
    }
}

// Export singleton
export const guessWorkEmailProvider = new GuessWorkEmailProvider();
