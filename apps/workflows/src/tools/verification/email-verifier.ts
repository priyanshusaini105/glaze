/**
 * Email Verification Tool
 *
 * Verifies email candidates via pattern inference and mock SMTP checking.
 */

import { logger } from "@trigger.dev/sdk";
import type { ProviderResult, EnrichmentFieldKey } from "../../types/enrichment";

export interface EmailVerificationResult {
    email: string;
    verified: boolean;
    deliverable: boolean;
    score: number;
    reason?: string;
}

/**
 * Mock email verifier.
 * In production, replace with real SMTP/third-party verification.
 */
export async function verifyEmail(email: string): Promise<EmailVerificationResult> {
    logger.info("📧 Verifying email", { email });

    // Mock verification logic based on email patterns
    const domain = email.split("@")[1] || "";

    // Check for disposable domains
    const disposableDomains = ["tempmail.com", "throwaway.com", "fakeinbox.com"];
    if (disposableDomains.includes(domain)) {
        return {
            email,
            verified: false,
            deliverable: false,
            score: 0.1,
            reason: "Disposable email domain",
        };
    }

    // Check for valid format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return {
            email,
            verified: false,
            deliverable: false,
            score: 0,
            reason: "Invalid email format",
        };
    }

    // Mock: assume most properly formatted emails are valid
    // In production, do actual SMTP verification
    const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const deliverable = hash % 10 > 1; // 80% success rate mock
    const score = deliverable ? 0.8 + (hash % 20) / 100 : 0.3;

    return {
        email,
        verified: true,
        deliverable,
        score,
        reason: deliverable ? "SMTP check passed (mock)" : "SMTP check failed (mock)",
    };
}

/**
 * Verify email candidates and return updated results.
 */
export async function verifyEmailCandidates(
    emailResults: ProviderResult[]
): Promise<ProviderResult[]> {
    const verifiedResults: ProviderResult[] = [];

    for (const result of emailResults) {
        if (result.field !== "emailCandidates") {
            verifiedResults.push(result);
            continue;
        }

        const emails = Array.isArray(result.value) ? result.value : [result.value];
        const verifiedEmails: string[] = [];
        let bestScore = 0;

        for (const email of emails) {
            if (typeof email !== "string") continue;

            const verification = await verifyEmail(email);
            if (verification.deliverable) {
                verifiedEmails.push(email);
                bestScore = Math.max(bestScore, verification.score);
            }
        }

        verifiedResults.push({
            ...result,
            value: verifiedEmails.length > 0 ? verifiedEmails : result.value,
            verified: verifiedEmails.length > 0,
            confidence: verifiedEmails.length > 0 ? bestScore : result.confidence * 0.5,
        });
    }

    return verifiedResults;
}

/**
 * Pattern-based email inference tool.
 * Generates email candidates based on name and domain.
 */
export function inferEmailCandidates(
    name: string | undefined,
    domain: string | undefined
): ProviderResult | null {
    if (!name || !domain) return null;

    const nameParts = name.toLowerCase().split(/\s+/);
    const firstName = nameParts[0] || "";
    const lastName = nameParts[nameParts.length - 1] || "";

    const patterns = [
        `${firstName}.${lastName}@${domain}`,
        `${firstName}@${domain}`,
        `${firstName[0]}${lastName}@${domain}`,
        `${firstName}${lastName[0]}@${domain}`,
        `${firstName}_${lastName}@${domain}`,
    ].filter((e) => e.length > 5); // Filter out invalid patterns

    logger.info("🔮 Inferred email patterns", { name, domain, patterns: patterns.length });

    return {
        field: "emailCandidates",
        value: patterns,
        confidence: 0.3, // Low confidence for pattern inference
        source: "pattern_inference",
        timestamp: new Date().toISOString(),
        raw: { patterns, method: "pattern_inference" },
    };
}
