/**
 * Email Verification Tool
 * 
 * Phase 3 email pipeline tool.
 * Verifies email candidates using various methods:
 * - SMTP ping (free but unreliable)
 * - Hunter.io API (reliable)
 * - ZeroBounce API (high accuracy)
 * 
 * Confidence: 0.95 for verified emails
 */

import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../../types/enrichment";
import type { EmailCandidate } from "@glaze/types/field-value";

// API keys
const HUNTER_API_KEY = process.env.HUNTER_API_KEY;
const ZEROBOUNCE_API_KEY = process.env.ZEROBOUNCE_API_KEY;

/**
 * Email verification result
 */
interface VerificationResult {
    email: string;
    verified: boolean;
    deliverable: boolean;
    reason?: string;
    confidence: number;
    provider: string;
}

/**
 * Hunter.io response types
 */
interface HunterVerifyResponse {
    data: {
        status: 'valid' | 'invalid' | 'accept_all' | 'webmail' | 'disposable' | 'unknown';
        result: 'deliverable' | 'undeliverable' | 'risky' | 'unknown';
        score: number;
        email: string;
        regexp: boolean;
        gibberish: boolean;
        disposable: boolean;
        webmail: boolean;
        mx_records: boolean;
        smtp_server: boolean;
        smtp_check: boolean;
        accept_all: boolean;
        block: boolean;
    };
    meta: {
        params: { email: string };
    };
}

/**
 * ZeroBounce response types
 */
interface ZeroBounceResponse {
    address: string;
    status: 'valid' | 'invalid' | 'catch-all' | 'unknown' | 'spamtrap' | 'abuse' | 'do_not_mail';
    sub_status: string;
    free_email: boolean;
    did_you_mean: string | null;
    account: string;
    domain: string;
    domain_age_days: string;
    smtp_provider: string;
    mx_found: string;
    mx_record: string;
    firstname: string;
    lastname: string;
    gender: string;
    country: string;
    region: string;
    city: string;
    zipcode: string;
    processed_at: string;
}

/**
 * Verify email using Hunter.io
 */
async function verifyWithHunter(email: string): Promise<VerificationResult | null> {
    if (!HUNTER_API_KEY) {
        return null;
    }

    try {
        const response = await fetch(
            `https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_API_KEY}`
        );

        if (!response.ok) {
            logger.error("❌ HunterVerifier: API error", {
                status: response.status,
                email,
            });
            return null;
        }

        const data = await response.json() as HunterVerifyResponse;
        const result = data.data;

        return {
            email,
            verified: result.result === 'deliverable',
            deliverable: result.result === 'deliverable',
            reason: result.result,
            confidence: result.score / 100,
            provider: 'hunter',
        };
    } catch (error) {
        logger.error("❌ HunterVerifier: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
            email,
        });
        return null;
    }
}

/**
 * Verify email using ZeroBounce
 */
async function verifyWithZeroBounce(email: string): Promise<VerificationResult | null> {
    if (!ZEROBOUNCE_API_KEY) {
        return null;
    }

    try {
        const response = await fetch(
            `https://api.zerobounce.net/v2/validate?api_key=${ZEROBOUNCE_API_KEY}&email=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
            logger.error("❌ ZeroBounceVerifier: API error", {
                status: response.status,
                email,
            });
            return null;
        }

        const data = await response.json() as ZeroBounceResponse;

        const isValid = data.status === 'valid';
        const isCatchAll = data.status === 'catch-all';
        
        // Catch-all domains can receive any email, so we treat them as potentially valid
        const deliverable = isValid || isCatchAll;
        
        // Higher confidence for valid, lower for catch-all
        const confidence = isValid ? 0.95 : (isCatchAll ? 0.6 : 0.1);

        return {
            email,
            verified: isValid,
            deliverable,
            reason: `${data.status}/${data.sub_status}`,
            confidence,
            provider: 'zerobounce',
        };
    } catch (error) {
        logger.error("❌ ZeroBounceVerifier: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
            email,
        });
        return null;
    }
}

/**
 * Simple MX record check (free, basic validation)
 */
async function checkMxRecords(domain: string): Promise<boolean> {
    try {
        // Use a DNS-over-HTTPS service to check MX records
        const response = await fetch(
            `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`
        );

        if (!response.ok) {
            return false;
        }

        const data = await response.json() as { Answer?: Array<{ type: number }> };
        return Boolean(data.Answer && data.Answer.length > 0);
    } catch {
        return false;
    }
}

/**
 * Verify a single email
 */
export async function verifyEmail(email: string): Promise<VerificationResult> {
    logger.info("📧 EmailVerifier: Verifying email", { email });

    // Try ZeroBounce first (most accurate)
    let result = await verifyWithZeroBounce(email);
    if (result) {
        logger.info("✅ EmailVerifier: ZeroBounce result", {
            email,
            verified: result.verified,
            confidence: result.confidence,
        });
        return result;
    }

    // Fallback to Hunter.io
    result = await verifyWithHunter(email);
    if (result) {
        logger.info("✅ EmailVerifier: Hunter result", {
            email,
            verified: result.verified,
            confidence: result.confidence,
        });
        return result;
    }

    // Last resort: MX record check
    const domain = email.split('@')[1];
    if (domain) {
        const hasMx = await checkMxRecords(domain);
        logger.info("✅ EmailVerifier: MX check result", {
            email,
            hasMx,
        });
        return {
            email,
            verified: false, // MX check alone doesn't verify the email
            deliverable: hasMx, // But it does tell us if the domain can receive email
            reason: hasMx ? 'mx_exists' : 'no_mx',
            confidence: hasMx ? 0.3 : 0.1,
            provider: 'mx_check',
        };
    }

    return {
        email,
        verified: false,
        deliverable: false,
        reason: 'no_verification_available',
        confidence: 0.1,
        provider: 'none',
    };
}

/**
 * Verify multiple email candidates and return the best one
 */
export async function verifyEmailCandidates(
    candidates: EmailCandidate[],
    options: {
        maxToVerify?: number;
        stopOnFirstVerified?: boolean;
    } = {}
): Promise<{
    verified: EmailCandidate[];
    best: EmailCandidate | null;
    all: EmailCandidate[];
}> {
    const { maxToVerify = 3, stopOnFirstVerified = true } = options;
    
    const results: EmailCandidate[] = [];
    
    // Sort by confidence (highest first)
    const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
    
    for (let i = 0; i < Math.min(sorted.length, maxToVerify); i++) {
        const candidate = sorted[i]!;
        const verification = await verifyEmail(candidate.email);
        
        const updatedCandidate: EmailCandidate = {
            ...candidate,
            verified: verification.verified,
            confidence: verification.confidence,
            sources: [...candidate.sources, verification.provider],
        };
        
        results.push(updatedCandidate);
        
        if (stopOnFirstVerified && verification.verified) {
            break;
        }
    }
    
    // Add unverified candidates to results
    for (const candidate of sorted) {
        if (!results.find(r => r.email === candidate.email)) {
            results.push(candidate);
        }
    }
    
    const verified = results.filter(c => c.verified);
    const best = verified[0] ?? results.sort((a, b) => b.confidence - a.confidence)[0] ?? null;
    
    return { verified, best, all: results };
}

/**
 * Email Verifier Provider
 */
export class EmailVerifierProvider {
    name = "email_verifier";
    tier = "cheap" as const;
    costCents = 1; // ~1 cent per verification

    canEnrich(field: EnrichmentFieldKey): boolean {
        return field === "emailCandidates";
    }

    async enrich(
        input: NormalizedInput,
        _field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        // Get existing candidates from input
        const raw = input.raw as Record<string, unknown>;
        const existingCandidates = raw?.emailCandidates as string[] | undefined;

        if (!existingCandidates || existingCandidates.length === 0) {
            logger.debug("📧 EmailVerifierProvider: No candidates to verify", {
                rowId: input.rowId,
            });
            return null;
        }

        logger.info("📧 EmailVerifierProvider: Verifying candidates", {
            rowId: input.rowId,
            count: existingCandidates.length,
        });

        // Convert to EmailCandidate format
        const candidates: EmailCandidate[] = existingCandidates.map(email => ({
            email,
            confidence: 0.3,
            verified: false,
            sources: ['input'],
        }));

        const { best, all } = await verifyEmailCandidates(candidates);

        if (!best) {
            return null;
        }

        logger.info("✅ EmailVerifierProvider: Verification complete", {
            rowId: input.rowId,
            verified: all.filter(c => c.verified).length,
            bestEmail: best.email,
            bestConfidence: best.confidence,
        });

        return {
            field: "emailCandidates",
            value: all.map(c => c.email),
            confidence: best.confidence,
            source: this.name,
            costCents: this.costCents * Math.min(existingCandidates.length, 3),
            timestamp: new Date().toISOString(),
            verified: best.verified,
            raw: { candidates: all, best },
        };
    }
}

// Export singleton instance
export const emailVerifierProvider = new EmailVerifierProvider();
