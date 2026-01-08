/**
 * GuessWorkEmail Tool
 * 
 * Finds professional email addresses using a waterfall strategy:
 * 1. Hunter.io Email Finder (high confidence, 50 free/month)
 * 2. Prospeo Email Finder (75 free credits/month)
 * 3. Optional email verification
 * 
 * Input: name + companyDomain
 * Output: email, confidence, source, verificationStatus
 * 
 * RULES:
 * - Never guess/hallucinate emails
 * - Use real API responses only
 * - Normalize confidence to 0-1
 * - Cache aggressively
 * - Respect rate limits
 */

import { logger } from "@trigger.dev/sdk";
import {
    withCache,
    CACHE_TTL,
    buildWorkEmailCacheKey,
} from "@/cache";

// ============================================================
// TYPES
// ============================================================

export interface GuessWorkEmailResult {
    email: string | null;
    confidence: number;
    source: "hunter" | "prospeo" | "pattern_inference" | "not_found";
    verificationStatus: "valid" | "invalid" | "catch_all" | "unknown";
    hunterScore?: number;
    firstName?: string;
    lastName?: string;
    sources?: string[];
    reason?: string;
}

interface HunterEmailFinderResponse {
    data: {
        email: string | null;
        score: number;
        first_name: string;
        last_name: string;
        position: string | null;
        twitter: string | null;
        linkedin_url: string | null;
        sources: Array<{
            domain: string;
            uri: string;
            extracted_on: string;
            still_on_page: boolean;
        }>;
        verification: {
            date: string | null;
            status: "valid" | "invalid" | "accept_all" | "webmail" | "disposable" | "unknown";
        };
    };
    meta: {
        params: {
            first_name: string;
            last_name: string;
            domain: string;
        };
    };
}

interface ProspeoEmailFinderResponse {
    email: string | null;
    status: string;
    firstName?: string;
    lastName?: string;
    companyDomain?: string;
}

interface ProspeoEmailVerifierResponse {
    email: string;
    status: "valid" | "invalid" | "catch_all" | "unknown";
    disposable: boolean;
    accept_all: boolean;
    free: boolean;
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

// ============================================================
// PROVIDER 1: HUNTER.IO
// ============================================================

/**
 * Find email using Hunter.io Email Finder API
 * 
 * GET https://api.hunter.io/v2/email-finder
 * ?first_name=John&last_name=Doe&domain=stripe.com&api_key=KEY
 */
async function hunterEmailFinder(
    firstName: string,
    lastName: string,
    domain: string
): Promise<HunterEmailFinderResponse | null> {
    const apiKey = process.env.HUNTER_API_KEY;
    if (!apiKey) {
        logger.info("⚠️ GuessWorkEmail: HUNTER_API_KEY not configured, skipping Hunter");
        return null;
    }

    const url = new URL("https://api.hunter.io/v2/email-finder");
    url.searchParams.set("first_name", firstName);
    url.searchParams.set("last_name", lastName);
    url.searchParams.set("domain", domain);
    url.searchParams.set("api_key", apiKey);

    try {
        logger.info("🔍 GuessWorkEmail: Trying Hunter.io", { firstName, lastName, domain });

        const response = await fetch(url.toString(), {
            method: "GET",
            headers: { "Accept": "application/json" },
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.warn("⚠️ Hunter API error", {
                status: response.status,
                body: errorBody.slice(0, 200),
            });
            return null;
        }

        const data: HunterEmailFinderResponse = await response.json();

        logger.info("✅ GuessWorkEmail: Hunter response", {
            email: data.data?.email,
            score: data.data?.score,
            verificationStatus: data.data?.verification?.status,
        });

        return data;
    } catch (error) {
        logger.error("❌ Hunter request failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// PROVIDER 2: PROSPEO
// ============================================================

/**
 * Find email using Prospeo Email Finder API
 * 
 * POST https://api.prospeo.io/email-finder
 * Body: { "fullName": "John Doe", "companyDomain": "stripe.com" }
 */
async function prospeoEmailFinder(
    fullName: string,
    domain: string
): Promise<ProspeoEmailFinderResponse | null> {
    const apiKey = process.env.PROSPEO_API_KEY;
    if (!apiKey) {
        logger.info("⚠️ GuessWorkEmail: PROSPEO_API_KEY not configured, skipping Prospeo");
        return null;
    }

    try {
        logger.info("🔍 GuessWorkEmail: Trying Prospeo", { fullName, domain });

        const response = await fetch("https://api.prospeo.io/email-finder", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                fullName,
                companyDomain: domain,
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            logger.warn("⚠️ Prospeo API error", {
                status: response.status,
                body: errorBody.slice(0, 200),
            });
            return null;
        }

        const data: ProspeoEmailFinderResponse = await response.json();

        logger.info("✅ GuessWorkEmail: Prospeo response", {
            email: data.email,
            status: data.status,
        });

        return data;
    } catch (error) {
        logger.error("❌ Prospeo request failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

/**
 * Verify email using Prospeo Email Verifier API
 * 
 * POST https://api.prospeo.io/email-verifier
 * Body: { "email": "predicted@domain.com" }
 */
async function prospeoEmailVerifier(
    email: string
): Promise<ProspeoEmailVerifierResponse | null> {
    const apiKey = process.env.PROSPEO_API_KEY;
    if (!apiKey) {
        return null;
    }

    try {
        logger.info("🔍 GuessWorkEmail: Verifying with Prospeo", { email });

        const response = await fetch("https://api.prospeo.io/email-verifier", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({ email }),
        });

        if (!response.ok) {
            return null;
        }

        const data: ProspeoEmailVerifierResponse = await response.json();

        logger.info("✅ GuessWorkEmail: Verification result", {
            email,
            status: data.status,
        });

        return data;
    } catch (error) {
        logger.error("❌ Prospeo verification failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return null;
    }
}

// ============================================================
// CONFIDENCE NORMALIZATION
// ============================================================

/**
 * Normalize Hunter score (0-100) to confidence (0-1)
 */
function normalizeHunterConfidence(
    score: number,
    verificationStatus: string | undefined
): number {
    // Base: Hunter score / 100
    let confidence = score / 100;

    // Adjust based on verification status
    switch (verificationStatus) {
        case "valid":
            confidence = Math.min(1.0, confidence + 0.1);
            break;
        case "accept_all":
            // Catch-all domain, less reliable
            confidence = Math.min(0.7, confidence);
            break;
        case "invalid":
            confidence = 0.1;
            break;
        case "unknown":
        default:
            // No change
            break;
    }

    return Math.min(1.0, Math.max(0, confidence));
}

/**
 * Normalize Prospeo result to confidence (0-1)
 * Prospeo only returns boolean found, so base is 0.5
 */
function normalizeProspeoConfidence(
    emailFound: boolean,
    verificationResult: ProspeoEmailVerifierResponse | null
): number {
    if (!emailFound) return 0;

    // Base confidence for Prospeo
    let confidence = 0.5;

    // Boost based on verification
    if (verificationResult) {
        switch (verificationResult.status) {
            case "valid":
                confidence += 0.35;
                break;
            case "catch_all":
                confidence += 0.15;
                break;
            case "invalid":
                confidence = 0.1;
                break;
            case "unknown":
            default:
                confidence += 0.1;
                break;
        }

        // Penalty for disposable/free
        if (verificationResult.disposable) {
            confidence -= 0.3;
        }
        if (verificationResult.free) {
            confidence -= 0.2;
        }
    }

    return Math.min(1.0, Math.max(0, confidence));
}

/**
 * Map various verification statuses to our standard format
 */
function normalizeVerificationStatus(
    hunterStatus?: string,
    prospeoStatus?: string
): "valid" | "invalid" | "catch_all" | "unknown" {
    const status = hunterStatus || prospeoStatus;

    switch (status) {
        case "valid":
            return "valid";
        case "invalid":
            return "invalid";
        case "accept_all":
        case "catch_all":
            return "catch_all";
        default:
            return "unknown";
    }
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Internal uncached implementation of email discovery
 */
async function guessWorkEmailInternal(
    name: string,
    companyDomain: string
): Promise<GuessWorkEmailResult> {
    logger.info("📧 GuessWorkEmail: Starting", { name, companyDomain });

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

    // STEP 1: Try Hunter Email Finder
    const hunterResult = await hunterEmailFinder(firstName, lastName, domain);

    if (hunterResult?.data?.email) {
        const email = hunterResult.data.email;
        const score = hunterResult.data.score || 0;
        const verificationStatus = hunterResult.data.verification?.status;

        // Check if confidence meets threshold
        if (score >= 60) {
            const confidence = normalizeHunterConfidence(score, verificationStatus);

            logger.info("✅ GuessWorkEmail: Hunter success", {
                email,
                confidence,
                score,
            });

            return {
                email,
                confidence,
                source: "hunter",
                verificationStatus: normalizeVerificationStatus(verificationStatus),
                hunterScore: score,
                firstName: hunterResult.data.first_name,
                lastName: hunterResult.data.last_name,
                sources: hunterResult.data.sources?.map(s => s.uri) || [],
            };
        } else {
            logger.info("⚠️ GuessWorkEmail: Hunter score below threshold", {
                email,
                score,
                threshold: 60,
            });
        }
    }

    // STEP 2: Try Prospeo Email Finder (fallback)
    const prospeoResult = await prospeoEmailFinder(name, domain);

    if (prospeoResult?.email) {
        const email = prospeoResult.email;

        // Optionally verify with Prospeo
        const verificationResult = await prospeoEmailVerifier(email);

        const confidence = normalizeProspeoConfidence(true, verificationResult);
        const verificationStatus = normalizeVerificationStatus(
            undefined,
            verificationResult?.status
        );

        logger.info("✅ GuessWorkEmail: Prospeo success", {
            email,
            confidence,
            verified: !!verificationResult,
        });

        return {
            email,
            confidence,
            source: "prospeo",
            verificationStatus,
            firstName,
            lastName: lastName || undefined,
        };
    }

    // STEP 3: Both providers failed
    logger.info("⚠️ GuessWorkEmail: No email found", { name, domain });

    return {
        email: null,
        confidence: 0,
        source: "not_found",
        verificationStatus: "unknown",
        firstName,
        lastName: lastName || undefined,
        reason: "No email found via Hunter or Prospeo",
    };
}

/**
 * Find work email using Hunter → Prospeo waterfall strategy (CACHED)
 */
export async function guessWorkEmail(
    name: string,
    companyDomain: string
): Promise<GuessWorkEmailResult> {
    const cacheKey = buildWorkEmailCacheKey(name, companyDomain);

    const result = await withCache<GuessWorkEmailResult>(
        cacheKey,
        async () => guessWorkEmailInternal(name, companyDomain),
        {
            ttl: CACHE_TTL.EMAIL_VERIFICATION, // 7 days
            keyPrefix: 'person',
            logLabel: 'GuessWorkEmail',
        }
    );

    if (!result) {
        logger.warn("⚠️ GuessWorkEmail: Cache returned null");
        return guessWorkEmailInternal(name, companyDomain);
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

    async enrich(name: string, companyDomain: string): Promise<GuessWorkEmailResult> {
        return guessWorkEmail(name, companyDomain);
    }
}

// Export singleton
export const guessWorkEmailProvider = new GuessWorkEmailProvider();
