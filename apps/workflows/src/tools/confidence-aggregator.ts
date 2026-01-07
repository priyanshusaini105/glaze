/**
 * Confidence Aggregator Tool
 * 
 * Aggregates confidence scores from multiple sources.
 * Implements multi-source consensus logic:
 * - If sources ≥ 2 agree, boost confidence
 * - Conflict detection and resolution
 * - Source weight normalization
 */

import { logger } from "@trigger.dev/sdk";
import type { ProviderResult, EnrichmentFieldKey, Confidence } from "../types/enrichment";
import { SOURCE_TRUST_WEIGHTS } from "@glaze/types/field-value";

/**
 * Aggregated result for a field
 */
export interface AggregatedField {
    field: EnrichmentFieldKey;
    canonicalValue: string | number | string[] | null;
    confidence: Confidence;
    sources: string[];
    hasConflict: boolean;
    conflictingValues?: Array<{ value: unknown; source: string; confidence: number }>;
    allResults: ProviderResult[];
}

/**
 * Value similarity threshold for considering values as "matching"
 */
const SIMILARITY_THRESHOLD = 0.85;

/**
 * Minimum sources for consensus boost
 */
const MIN_SOURCES_FOR_CONSENSUS = 2;

/**
 * Confidence boost when multiple sources agree
 */
const CONSENSUS_BOOST = 0.1;

/**
 * Normalize a value for comparison
 */
function normalizeValue(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    if (Array.isArray(value)) {
        return value.map(v => normalizeValue(v)).sort().join('|');
    }
    return String(value).toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Calculate similarity between two values (0-1)
 */
function calculateSimilarity(value1: unknown, value2: unknown): number {
    const norm1 = normalizeValue(value1);
    const norm2 = normalizeValue(value2);
    
    if (norm1 === norm2) {
        return 1.0;
    }
    
    if (norm1.length === 0 || norm2.length === 0) {
        return 0;
    }
    
    // Check if one contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) {
        const containmentRatio = Math.min(norm1.length, norm2.length) / Math.max(norm1.length, norm2.length);
        return 0.7 + (containmentRatio * 0.3);
    }
    
    // Levenshtein distance for short strings
    if (norm1.length < 100 && norm2.length < 100) {
        const distance = levenshteinDistance(norm1, norm2);
        const maxLen = Math.max(norm1.length, norm2.length);
        return Math.max(0, 1 - (distance / maxLen));
    }
    
    return 0;
}

/**
 * Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    
    if (m === 0) return n;
    if (n === 0) return m;
    
    const matrix: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 0; i <= m; i++) matrix[i]![0] = i;
    for (let j = 0; j <= n; j++) matrix[0]![j] = j;
    
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[i]![j] = Math.min(
                matrix[i - 1]![j]! + 1,
                matrix[i]![j - 1]! + 1,
                matrix[i - 1]![j - 1]! + cost
            );
        }
    }
    
    return matrix[m]![n]!;
}

/**
 * Group similar values together
 */
function groupSimilarValues(
    results: ProviderResult[]
): Array<{ value: unknown; results: ProviderResult[]; weightedConfidence: number }> {
    const groups: Array<{ value: unknown; results: ProviderResult[]; weightedConfidence: number }> = [];
    
    for (const result of results) {
        if (result.value === null || result.value === undefined) {
            continue;
        }
        
        // Find existing group with similar value
        let added = false;
        for (const group of groups) {
            const similarity = calculateSimilarity(group.value, result.value);
            if (similarity >= SIMILARITY_THRESHOLD) {
                group.results.push(result);
                
                // Update weighted confidence
                const sourceWeight = SOURCE_TRUST_WEIGHTS[result.source] ?? 0.5;
                group.weightedConfidence += result.confidence * sourceWeight;
                
                // Prefer the value from the more trusted source
                const existingWeight = SOURCE_TRUST_WEIGHTS[group.results[0]?.source ?? ''] ?? 0.5;
                if (sourceWeight > existingWeight) {
                    group.value = result.value;
                }
                
                added = true;
                break;
            }
        }
        
        if (!added) {
            const sourceWeight = SOURCE_TRUST_WEIGHTS[result.source] ?? 0.5;
            groups.push({
                value: result.value,
                results: [result],
                weightedConfidence: result.confidence * sourceWeight,
            });
        }
    }
    
    return groups;
}

/**
 * Aggregate results for a single field
 */
export function aggregateField(
    field: EnrichmentFieldKey,
    results: ProviderResult[]
): AggregatedField {
    const fieldResults = results.filter(r => r.field === field && r.value !== null);
    
    if (fieldResults.length === 0) {
        return {
            field,
            canonicalValue: null,
            confidence: 0,
            sources: [],
            hasConflict: false,
            allResults: [],
        };
    }
    
    // Group similar values
    const groups = groupSimilarValues(fieldResults);
    
    // Sort by weighted confidence
    groups.sort((a, b) => b.weightedConfidence - a.weightedConfidence);
    
    const bestGroup = groups[0]!;
    const hasConflict = groups.length > 1;
    
    // Calculate final confidence
    let confidence = bestGroup.weightedConfidence / bestGroup.results.length;
    
    // Apply consensus boost
    if (bestGroup.results.length >= MIN_SOURCES_FOR_CONSENSUS) {
        confidence = Math.min(1, confidence + CONSENSUS_BOOST);
    }
    
    // Penalize if there are conflicts
    if (hasConflict) {
        const conflictPenalty = 0.05 * (groups.length - 1);
        confidence = Math.max(0.1, confidence - conflictPenalty);
    }
    
    const aggregated: AggregatedField = {
        field,
        canonicalValue: bestGroup.value as string | number | string[] | null,
        confidence: Math.round(confidence * 100) / 100,
        sources: [...new Set(bestGroup.results.map(r => r.source))],
        hasConflict,
        allResults: fieldResults,
    };
    
    if (hasConflict) {
        aggregated.conflictingValues = groups.map(g => ({
            value: g.value,
            source: g.results.map(r => r.source).join(', '),
            confidence: g.weightedConfidence / g.results.length,
        }));
    }
    
    return aggregated;
}

/**
 * Aggregate results for multiple fields
 */
export function aggregateAllFields(
    results: ProviderResult[]
): Map<EnrichmentFieldKey, AggregatedField> {
    const fields = new Set(results.map(r => r.field));
    const aggregated = new Map<EnrichmentFieldKey, AggregatedField>();
    
    for (const field of fields) {
        aggregated.set(field, aggregateField(field, results));
    }
    
    return aggregated;
}

/**
 * Check if aggregated results meet confidence thresholds
 */
export function checkConfidenceThresholds(
    aggregated: Map<EnrichmentFieldKey, AggregatedField>,
    thresholds: Partial<Record<EnrichmentFieldKey, number>>
): {
    passed: EnrichmentFieldKey[];
    failed: EnrichmentFieldKey[];
    lowConfidence: Array<{ field: EnrichmentFieldKey; actual: number; required: number }>;
} {
    const passed: EnrichmentFieldKey[] = [];
    const failed: EnrichmentFieldKey[] = [];
    const lowConfidence: Array<{ field: EnrichmentFieldKey; actual: number; required: number }> = [];
    
    for (const [field, result] of aggregated) {
        const threshold = thresholds[field] ?? 0.5;
        
        if (result.confidence >= threshold) {
            passed.push(field);
        } else {
            failed.push(field);
            if (result.confidence > 0) {
                lowConfidence.push({
                    field,
                    actual: result.confidence,
                    required: threshold,
                });
            }
        }
    }
    
    return { passed, failed, lowConfidence };
}

/**
 * Get summary statistics for aggregation
 */
export function getAggregationSummary(
    aggregated: Map<EnrichmentFieldKey, AggregatedField>
): {
    totalFields: number;
    fieldsWithValue: number;
    fieldsWithConflict: number;
    averageConfidence: number;
    sourceBreakdown: Record<string, number>;
} {
    let totalConfidence = 0;
    let fieldsWithValue = 0;
    let fieldsWithConflict = 0;
    const sourceBreakdown: Record<string, number> = {};
    
    for (const result of aggregated.values()) {
        if (result.canonicalValue !== null) {
            fieldsWithValue++;
            totalConfidence += result.confidence;
        }
        if (result.hasConflict) {
            fieldsWithConflict++;
        }
        for (const source of result.sources) {
            sourceBreakdown[source] = (sourceBreakdown[source] ?? 0) + 1;
        }
    }
    
    return {
        totalFields: aggregated.size,
        fieldsWithValue,
        fieldsWithConflict,
        averageConfidence: fieldsWithValue > 0 ? totalConfidence / fieldsWithValue : 0,
        sourceBreakdown,
    };
}

/**
 * Confidence Aggregator class for use in workflows
 */
export class ConfidenceAggregator {
    private results: ProviderResult[] = [];
    
    add(result: ProviderResult): void {
        this.results.push(result);
    }
    
    addAll(results: ProviderResult[]): void {
        this.results.push(...results);
    }
    
    aggregate(): Map<EnrichmentFieldKey, AggregatedField> {
        const aggregated = aggregateAllFields(this.results);
        
        logger.info("📊 ConfidenceAggregator: Aggregation complete", {
            ...getAggregationSummary(aggregated),
        });
        
        return aggregated;
    }
    
    getFieldResult(field: EnrichmentFieldKey): AggregatedField {
        return aggregateField(field, this.results);
    }
    
    reset(): void {
        this.results = [];
    }
}
