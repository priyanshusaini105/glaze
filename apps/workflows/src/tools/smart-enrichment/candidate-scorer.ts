/**
 * Candidate Scorer & Decision Maker
 * 
 * Layer 3: Ambiguity handling - honest confidence assessment
 * 
 * Rules:
 * - If score ≥ 0.8 → accept with high confidence
 * - If 0.6-0.8 → accept but mark as "estimated"
 * - If < 0.6 → return null (better to admit we don't know)
 * - If top two candidates are too close → cap confidence, mark ambiguous
 */

import { logger } from "@trigger.dev/sdk";
import type { VerificationResult } from "./domain-verifier";

export interface EnrichmentDecision {
    value: string | null;
    url: string | null;
    confidence: number;
    status: "verified" | "estimated" | "ambiguous" | "unknown";
    reasons: string[];
    warnings: string[];
    candidates: Array<{
        domain: string;
        score: number;
    }>;
}

// Thresholds
const HIGH_CONFIDENCE_THRESHOLD = 0.8;
const ACCEPT_THRESHOLD = 0.6;
const AMBIGUITY_GAP = 0.1; // If top two are within 0.1, mark ambiguous

/**
 * Make a decision based on verified candidates
 */
export function makeDecision(
    verifiedCandidates: VerificationResult[],
    fieldType: "domain" | "website" | "company" | "other" = "domain"
): EnrichmentDecision {
    logger.info("🎯 CandidateScorer: Making decision", {
        candidateCount: verifiedCandidates.length,
        topScores: verifiedCandidates.slice(0, 3).map(c => ({
            domain: c.candidate.domain,
            score: c.score.toFixed(2),
        })),
    });

    // No candidates found
    if (verifiedCandidates.length === 0) {
        return {
            value: null,
            url: null,
            confidence: 0,
            status: "unknown",
            reasons: ["no_candidates_found"],
            warnings: [],
            candidates: [],
        };
    }

    const top = verifiedCandidates[0]!;
    const second = verifiedCandidates[1];
    const candidatesSummary = verifiedCandidates.map(c => ({
        domain: c.candidate.domain,
        score: c.score,
    }));

    // Check for ambiguity: if top two are too close
    // EXCEPTION: If top candidate is canonical domain (domain = company name), 
    // it's not ambiguous - the primary domain should win over subdomains/variants
    let isAmbiguous = false;
    const topIsCanonical = top.reasons.includes("canonical_domain");

    if (second && (top.score - second.score) < AMBIGUITY_GAP && !topIsCanonical) {
        isAmbiguous = true;
        logger.warn("⚠️ CandidateScorer: Ambiguous result", {
            topDomain: top.candidate.domain,
            topScore: top.score,
            secondDomain: second.candidate.domain,
            secondScore: second.score,
        });
    } else if (topIsCanonical) {
        logger.info("✅ CandidateScorer: Canonical domain wins despite close scores", {
            topDomain: top.candidate.domain,
            topScore: top.score,
            secondDomain: second?.candidate.domain,
            secondScore: second?.score,
        });
    }

    // Decision logic
    if (top.score >= HIGH_CONFIDENCE_THRESHOLD && !isAmbiguous) {
        // High confidence, verified result
        return {
            value: fieldType === "website" ? top.candidate.url : top.candidate.domain,
            url: top.candidate.url,
            confidence: top.score,
            status: "verified",
            reasons: top.reasons,
            warnings: top.warnings,
            candidates: candidatesSummary,
        };
    }

    if (top.score >= ACCEPT_THRESHOLD) {
        // Acceptable but not perfect
        // If ambiguous, cap at 0.72 (just above the 0.7 acceptance threshold)
        // so we still return a result but mark it appropriately
        const finalConfidence = isAmbiguous
            ? Math.min(top.score, 0.72)
            : top.score;

        return {
            value: fieldType === "website" ? top.candidate.url : top.candidate.domain,
            url: top.candidate.url,
            confidence: finalConfidence,
            status: isAmbiguous ? "ambiguous" : "estimated",
            reasons: top.reasons,
            warnings: isAmbiguous
                ? [...top.warnings, "close_competitor"]
                : top.warnings,
            candidates: candidatesSummary,
        };
    }

    // Score too low - reject
    logger.info("❌ CandidateScorer: Rejecting low-confidence result", {
        topDomain: top.candidate.domain,
        topScore: top.score,
    });

    return {
        value: null,
        url: null,
        confidence: top.score,
        status: "unknown",
        reasons: ["confidence_too_low"],
        warnings: top.warnings,
        candidates: candidatesSummary,
    };
}

/**
 * Format decision for storage with full provenance
 */
export function formatForStorage(decision: EnrichmentDecision): {
    value: string | null;
    confidence: number;
    metadata: Record<string, unknown>;
} {
    return {
        value: decision.value,
        confidence: decision.confidence,
        metadata: {
            status: decision.status,
            url: decision.url,
            reasons: decision.reasons,
            warnings: decision.warnings,
            candidates: decision.candidates,
            enrichedAt: new Date().toISOString(),
        },
    };
}
