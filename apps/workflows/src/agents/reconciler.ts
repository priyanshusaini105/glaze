/**
 * Reconciler Agent
 *
 * Takes all evidence (ProviderResults) and picks canonical values
 * based on source weights and confidence scores.
 */

import { logger } from "@trigger.dev/sdk";
import type {
    CanonicalData,
    EnrichmentFieldKey,
    Provenance,
    ProviderResult,
    SOURCE_WEIGHTS,
    CONFIDENCE_THRESHOLDS,
} from "../types/enrichment";

const sourceWeights: Record<string, number> = {
    linkedin_api: 0.95,
    mock_linkedin: 0.9,
    hunter: 0.9,
    mock_hunter: 0.85,
    open_corporates: 0.95,
    mock_opencorporates: 0.9,
    github: 0.9,
    mock_github: 0.85,
    whois: 0.85,
    serp: 0.7,
    pattern_inference: 0.3,
    llm: 0.2,
};

const confidenceThresholds: Partial<Record<EnrichmentFieldKey, number>> = {
    name: 0.6,
    company: 0.6,
    emailCandidates: 0.5,
    title: 0.5,
    shortBio: 0.4,
    socialLinks: 0.5,
    companySize: 0.4,
    location: 0.5,
    companySummary: 0.4,
};

/**
 * Calculate the weighted score for a result.
 */
function calculateScore(result: ProviderResult): number {
    const weight = sourceWeights[result.source] || 0.5;
    return weight * result.confidence;
}

/**
 * Reconcile evidence into canonical data.
 */
export function reconcileEvidence(evidence: ProviderResult[]): {
    canonical: CanonicalData;
    provenance: Provenance[];
    ambiguousFields: EnrichmentFieldKey[];
} {
    const canonical: CanonicalData = {};
    const provenance: Provenance[] = [];
    const ambiguousFields: EnrichmentFieldKey[] = [];

    // Group evidence by field
    const byField = new Map<EnrichmentFieldKey, ProviderResult[]>();
    for (const result of evidence) {
        const existing = byField.get(result.field) || [];
        existing.push(result);
        byField.set(result.field, existing);
    }

    // For each field, pick the best result
    for (const [field, results] of Array.from(byField.entries())) {
        // Sort by score descending
        const sorted = results.sort((a, b) => calculateScore(b) - calculateScore(a));
        const best = sorted[0];

        if (!best) continue;

        const score = calculateScore(best);
        const threshold = confidenceThresholds[field] || 0.5;

        // Add provenance for all results
        for (const r of results) {
            provenance.push({
                source: r.source,
                timestamp: r.timestamp,
                confidence: r.confidence,
                rawValue: r.raw,
                field,
            });
        }

        // Check if the best result meets the threshold
        if (score < threshold) {
            ambiguousFields.push(field);
            logger.warn("⚠️ Reconciler: Field below threshold", {
                field,
                score,
                threshold,
                bestSource: best.source,
            });
        }

        canonical[field] = {
            value: best.value,
            confidence: best.confidence,
            source: best.source,
            verified: best.verified,
        };

        logger.info("✅ Reconciler: Selected canonical value", {
            field,
            source: best.source,
            confidence: best.confidence,
            score,
        });
    }

    return { canonical, provenance, ambiguousFields };
}

/**
 * Check if any required fields are missing from canonical data.
 */
export function getMissingFields(
    canonical: CanonicalData,
    requiredFields: EnrichmentFieldKey[]
): EnrichmentFieldKey[] {
    return requiredFields.filter((field) => {
        const data = canonical[field];
        return !data || data.value === null;
    });
}
