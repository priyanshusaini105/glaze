/**
 * Verifier Agent
 * 
 * Checks results from the Executor and makes decisions:
 * - Accept if confidence passes thresholds
 * - Escalate to premium providers if needed
 * - Require more data if ambiguous
 * 
 * Also triggers LLM synthesis for text fields after verification.
 */

import { logger } from "@trigger.dev/sdk";
import type {
    ProviderResult,
    EnrichmentFieldKey,
    CanonicalData,
    NormalizedInput,
} from "../types/enrichment";
import { CONFIDENCE_THRESHOLDS } from "../types/enrichment";
import {
    aggregateAllFields,
    checkConfidenceThresholds,
    getAggregationSummary,
    type AggregatedField,
} from "../tools/confidence-aggregator";
import {
    recordProvenanceBatch,
    findConflicts,
    getProvenanceSummary,
} from "../tools/provenance-recorder";

/**
 * Verification decision types
 */
export type VerificationDecision = 'accept' | 'escalate' | 'require-more' | 'fail';

/**
 * Verification result for a single field
 */
export interface FieldVerification {
    field: EnrichmentFieldKey;
    decision: VerificationDecision;
    value: unknown;
    confidence: number;
    sources: string[];
    hasConflict: boolean;
    reason?: string;
}

/**
 * Overall verification result
 */
export interface VerificationResult {
    status: 'verified' | 'partial' | 'needs-escalation' | 'failed';
    fields: Map<EnrichmentFieldKey, FieldVerification>;
    canonical: CanonicalData;
    fieldsToEscalate: EnrichmentFieldKey[];
    fieldsNeedingMore: EnrichmentFieldKey[];
    summary: {
        total: number;
        accepted: number;
        escalated: number;
        failed: number;
        conflicts: number;
    };
}

/**
 * Confidence threshold overrides for specific scenarios
 */
const CONTEXT_THRESHOLDS: Record<string, Partial<Record<EnrichmentFieldKey, number>>> = {
    // Higher thresholds for critical fields
    critical: {
        name: 0.8,
        company: 0.8,
        emailCandidates: 0.7,
    },
    // Lower thresholds for best-effort enrichment
    bestEffort: {
        name: 0.4,
        company: 0.4,
        shortBio: 0.3,
        companySummary: 0.3,
    },
};

/**
 * Verify a single field result
 */
function verifyField(
    field: EnrichmentFieldKey,
    aggregated: AggregatedField,
    thresholds: Partial<Record<EnrichmentFieldKey, number>>
): FieldVerification {
    const threshold = thresholds[field] ?? CONFIDENCE_THRESHOLDS[field] ?? 0.5;
    
    // No value found
    if (aggregated.canonicalValue === null) {
        return {
            field,
            decision: 'require-more',
            value: null,
            confidence: 0,
            sources: [],
            hasConflict: false,
            reason: 'No value found from any source',
        };
    }
    
    // Check confidence
    if (aggregated.confidence >= threshold) {
        // High enough confidence - accept
        return {
            field,
            decision: 'accept',
            value: aggregated.canonicalValue,
            confidence: aggregated.confidence,
            sources: aggregated.sources,
            hasConflict: aggregated.hasConflict,
            reason: aggregated.hasConflict 
                ? `Accepted with conflict (${aggregated.conflictingValues?.length} values)` 
                : undefined,
        };
    }
    
    // Low confidence
    if (aggregated.confidence >= threshold * 0.5) {
        // Moderate confidence - escalate to premium
        return {
            field,
            decision: 'escalate',
            value: aggregated.canonicalValue,
            confidence: aggregated.confidence,
            sources: aggregated.sources,
            hasConflict: aggregated.hasConflict,
            reason: `Confidence ${(aggregated.confidence * 100).toFixed(0)}% below threshold ${(threshold * 100).toFixed(0)}%`,
        };
    }
    
    // Very low confidence - need more data
    return {
        field,
        decision: 'require-more',
        value: aggregated.canonicalValue,
        confidence: aggregated.confidence,
        sources: aggregated.sources,
        hasConflict: aggregated.hasConflict,
        reason: `Very low confidence ${(aggregated.confidence * 100).toFixed(0)}%`,
    };
}

/**
 * Build canonical data from verified fields
 */
function buildCanonicalData(
    fields: Map<EnrichmentFieldKey, FieldVerification>
): CanonicalData {
    const canonical: CanonicalData = {};
    
    for (const [field, verification] of fields) {
        if (verification.decision === 'accept' && verification.value !== null) {
            canonical[field] = {
                value: verification.value as string | number | string[] | null,
                confidence: verification.confidence,
                source: verification.sources.join(', '),
                verified: verification.sources.some(s => 
                    s.includes('verified') || s.includes('linkedin') || s.includes('hunter')
                ),
            };
        }
    }
    
    return canonical;
}

/**
 * Verify all results from the executor
 */
export async function verifyResults(
    input: NormalizedInput,
    results: ProviderResult[],
    options: {
        mode?: 'critical' | 'normal' | 'bestEffort';
        customThresholds?: Partial<Record<EnrichmentFieldKey, number>>;
    } = {}
): Promise<VerificationResult> {
    const { mode = 'normal', customThresholds } = options;
    
    logger.info("🔍 Verifier: Starting verification", {
        rowId: input.rowId,
        resultsCount: results.length,
        mode,
    });
    
    // Record provenance for all results
    recordProvenanceBatch(input.rowId, input.tableId, results);
    
    // Aggregate results by field
    const aggregated = aggregateAllFields(results);
    
    // Get thresholds
    const thresholds: Partial<Record<EnrichmentFieldKey, number>> = {
        ...CONFIDENCE_THRESHOLDS,
        ...(mode !== 'normal' ? CONTEXT_THRESHOLDS[mode] : {}),
        ...customThresholds,
    };
    
    // Verify each field
    const fieldVerifications = new Map<EnrichmentFieldKey, FieldVerification>();
    const fieldsToEscalate: EnrichmentFieldKey[] = [];
    const fieldsNeedingMore: EnrichmentFieldKey[] = [];
    let accepted = 0;
    let escalated = 0;
    let failed = 0;
    let conflicts = 0;
    
    for (const [field, aggResult] of aggregated) {
        const verification = verifyField(field, aggResult, thresholds);
        fieldVerifications.set(field, verification);
        
        switch (verification.decision) {
            case 'accept':
                accepted++;
                break;
            case 'escalate':
                escalated++;
                fieldsToEscalate.push(field);
                break;
            case 'require-more':
                failed++;
                fieldsNeedingMore.push(field);
                break;
            case 'fail':
                failed++;
                break;
        }
        
        if (verification.hasConflict) {
            conflicts++;
        }
    }
    
    // Build canonical data
    const canonical = buildCanonicalData(fieldVerifications);
    
    // Determine overall status
    let status: VerificationResult['status'];
    if (accepted === aggregated.size) {
        status = 'verified';
    } else if (fieldsToEscalate.length > 0) {
        status = 'needs-escalation';
    } else if (accepted > 0) {
        status = 'partial';
    } else {
        status = 'failed';
    }
    
    const result: VerificationResult = {
        status,
        fields: fieldVerifications,
        canonical,
        fieldsToEscalate,
        fieldsNeedingMore,
        summary: {
            total: aggregated.size,
            accepted,
            escalated,
            failed,
            conflicts,
        },
    };
    
    logger.info("✅ Verifier: Verification complete", {
        rowId: input.rowId,
        status,
        ...result.summary,
    });
    
    return result;
}

/**
 * Get fields that need premium provider escalation
 */
export function getEscalationTargets(
    verification: VerificationResult
): Array<{ field: EnrichmentFieldKey; reason: string }> {
    return verification.fieldsToEscalate.map(field => {
        const fieldResult = verification.fields.get(field);
        return {
            field,
            reason: fieldResult?.reason ?? 'Low confidence',
        };
    });
}

/**
 * Check if any fields have unresolved conflicts
 */
export function hasUnresolvedConflicts(verification: VerificationResult): boolean {
    return verification.summary.conflicts > 0;
}

/**
 * Get conflict details for manual resolution
 */
export function getConflictDetails(
    verification: VerificationResult
): Array<{
    field: EnrichmentFieldKey;
    acceptedValue: unknown;
    alternatives: Array<{ value: unknown; source: string; confidence: number }>;
}> {
    const details: Array<{
        field: EnrichmentFieldKey;
        acceptedValue: unknown;
        alternatives: Array<{ value: unknown; source: string; confidence: number }>;
    }> = [];
    
    for (const [field, fieldResult] of verification.fields) {
        if (fieldResult.hasConflict) {
            // Get conflict info from provenance
            const conflicts = findConflicts(field, field);
            details.push({
                field,
                acceptedValue: fieldResult.value,
                alternatives: conflicts.values.filter(v => v.value !== fieldResult.value),
            });
        }
    }
    
    return details;
}

/**
 * Merge new verification results with existing canonical data
 */
export function mergeCanonicalData(
    existing: CanonicalData,
    newData: CanonicalData,
    options: { overwriteLowerConfidence?: boolean } = {}
): CanonicalData {
    const { overwriteLowerConfidence = true } = options;
    const merged = { ...existing };
    
    for (const [field, value] of Object.entries(newData)) {
        const existingValue = merged[field];
        
        if (!existingValue) {
            merged[field] = value;
        } else if (overwriteLowerConfidence && value.confidence > existingValue.confidence) {
            merged[field] = value;
        }
    }
    
    return merged;
}

/**
 * Get verification summary for logging/metrics
 */
export function getVerificationSummary(
    verification: VerificationResult
): {
    status: string;
    acceptedFields: string[];
    escalatedFields: string[];
    failedFields: string[];
    conflictFields: string[];
    confidenceRange: { min: number; max: number; avg: number };
} {
    const acceptedFields: string[] = [];
    const escalatedFields: string[] = [];
    const failedFields: string[] = [];
    const conflictFields: string[] = [];
    const confidences: number[] = [];
    
    for (const [field, result] of verification.fields) {
        confidences.push(result.confidence);
        
        if (result.decision === 'accept') acceptedFields.push(field);
        else if (result.decision === 'escalate') escalatedFields.push(field);
        else failedFields.push(field);
        
        if (result.hasConflict) conflictFields.push(field);
    }
    
    const min = confidences.length > 0 ? Math.min(...confidences) : 0;
    const max = confidences.length > 0 ? Math.max(...confidences) : 0;
    const avg = confidences.length > 0 
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length 
        : 0;
    
    return {
        status: verification.status,
        acceptedFields,
        escalatedFields,
        failedFields,
        conflictFields,
        confidenceRange: { min, max, avg: Math.round(avg * 100) / 100 },
    };
}
