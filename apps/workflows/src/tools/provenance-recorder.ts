/**
 * Provenance Recorder Tool
 * 
 * Records source attribution for every field value.
 * This is critical for:
 * - Audit trail
 * - Debugging enrichment issues
 * - Understanding where data came from
 * - Conflict resolution
 */

import { logger } from "@trigger.dev/sdk";
import type { ProviderResult, Provenance, EnrichmentFieldKey } from "../types/enrichment";
import type { ProvenanceRecord } from "@repo/types";

/**
 * In-memory provenance store for the current workflow run
 * In production, this would be persisted to the database
 */
interface ProvenanceStore {
    records: ProvenanceRecord[];
    byRowId: Map<string, ProvenanceRecord[]>;
    byField: Map<string, ProvenanceRecord[]>;
}

let provenanceStore: ProvenanceStore = {
    records: [],
    byRowId: new Map(),
    byField: new Map(),
};

/**
 * Reset the provenance store (call at start of each workflow)
 */
export function resetProvenanceStore(): void {
    provenanceStore = {
        records: [],
        byRowId: new Map(),
        byField: new Map(),
    };
}

/**
 * Record a provenance entry for a provider result
 */
export function recordProvenance(
    rowId: string,
    tableId: string,
    result: ProviderResult
): ProvenanceRecord {
    const record: ProvenanceRecord = {
        id: `prov_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        rowId,
        tableId,
        field: result.field,
        source: result.source,
        value: result.value,
        confidence: result.confidence,
        rawResponse: result.raw,
        timestamp: result.timestamp,
        costCents: result.costCents ?? 0,
    };
    
    // Add to main list
    provenanceStore.records.push(record);
    
    // Index by rowId
    if (!provenanceStore.byRowId.has(rowId)) {
        provenanceStore.byRowId.set(rowId, []);
    }
    provenanceStore.byRowId.get(rowId)!.push(record);
    
    // Index by field
    if (!provenanceStore.byField.has(result.field)) {
        provenanceStore.byField.set(result.field, []);
    }
    provenanceStore.byField.get(result.field)!.push(record);
    
    logger.debug("📝 Provenance recorded", {
        recordId: record.id,
        rowId,
        field: result.field,
        source: result.source,
        confidence: result.confidence,
    });
    
    return record;
}

/**
 * Record provenance from multiple provider results
 */
export function recordProvenanceBatch(
    rowId: string,
    tableId: string,
    results: ProviderResult[]
): ProvenanceRecord[] {
    return results.map(result => recordProvenance(rowId, tableId, result));
}

/**
 * Get all provenance records for a row
 */
export function getProvenanceForRow(rowId: string): ProvenanceRecord[] {
    return provenanceStore.byRowId.get(rowId) ?? [];
}

/**
 * Get all provenance records for a specific field across all rows
 */
export function getProvenanceForField(field: EnrichmentFieldKey): ProvenanceRecord[] {
    return provenanceStore.byField.get(field) ?? [];
}

/**
 * Get provenance records for a specific row and field
 */
export function getProvenanceForRowField(
    rowId: string,
    field: EnrichmentFieldKey
): ProvenanceRecord[] {
    const rowRecords = provenanceStore.byRowId.get(rowId) ?? [];
    return rowRecords.filter(r => r.field === field);
}

/**
 * Get all provenance records from a specific source
 */
export function getProvenanceBySource(source: string): ProvenanceRecord[] {
    return provenanceStore.records.filter(r => r.source === source);
}

/**
 * Calculate total cost from provenance records
 */
export function calculateTotalCost(records?: ProvenanceRecord[]): number {
    const recordsToSum = records ?? provenanceStore.records;
    return recordsToSum.reduce((sum, r) => sum + r.costCents, 0);
}

/**
 * Get cost breakdown by source
 */
export function getCostBreakdownBySource(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const record of provenanceStore.records) {
        const source = record.source;
        breakdown[source] = (breakdown[source] ?? 0) + record.costCents;
    }
    
    return breakdown;
}

/**
 * Get summary statistics for provenance
 */
export function getProvenanceSummary(): {
    totalRecords: number;
    totalCostCents: number;
    uniqueRows: number;
    uniqueFields: number;
    sourceBreakdown: Record<string, { count: number; costCents: number; avgConfidence: number }>;
} {
    const sourceBreakdown: Record<string, { count: number; costCents: number; totalConfidence: number }> = {};
    
    for (const record of provenanceStore.records) {
        const source = record.source;
        if (!sourceBreakdown[source]) {
            sourceBreakdown[source] = { count: 0, costCents: 0, totalConfidence: 0 };
        }
        sourceBreakdown[source]!.count++;
        sourceBreakdown[source]!.costCents += record.costCents;
        sourceBreakdown[source]!.totalConfidence += record.confidence;
    }
    
    // Calculate averages
    const finalBreakdown: Record<string, { count: number; costCents: number; avgConfidence: number }> = {};
    for (const [source, data] of Object.entries(sourceBreakdown)) {
        finalBreakdown[source] = {
            count: data.count,
            costCents: data.costCents,
            avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
        };
    }
    
    return {
        totalRecords: provenanceStore.records.length,
        totalCostCents: calculateTotalCost(),
        uniqueRows: provenanceStore.byRowId.size,
        uniqueFields: provenanceStore.byField.size,
        sourceBreakdown: finalBreakdown,
    };
}

/**
 * Export provenance records for database persistence
 */
export function exportProvenanceRecords(): ProvenanceRecord[] {
    return [...provenanceStore.records];
}

/**
 * Find conflicting values for a field
 */
export function findConflicts(
    rowId: string,
    field: EnrichmentFieldKey
): { hasConflict: boolean; values: Array<{ value: unknown; source: string; confidence: number }> } {
    const records = getProvenanceForRowField(rowId, field);
    
    if (records.length <= 1) {
        return { hasConflict: false, values: records.map(r => ({ value: r.value, source: r.source, confidence: r.confidence })) };
    }
    
    // Check if all values are the same
    const values = records.map(r => JSON.stringify(r.value));
    const uniqueValues = new Set(values);
    
    return {
        hasConflict: uniqueValues.size > 1,
        values: records.map(r => ({ value: r.value, source: r.source, confidence: r.confidence })),
    };
}

/**
 * Convert legacy Provenance type to ProvenanceRecord
 */
export function fromLegacyProvenance(
    legacy: Provenance,
    rowId: string,
    tableId: string,
    costCents: number = 0
): ProvenanceRecord {
    return {
        id: `prov_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        rowId,
        tableId,
        field: legacy.field,
        source: legacy.source,
        value: legacy.rawValue,
        confidence: legacy.confidence,
        rawResponse: legacy.rawValue,
        timestamp: legacy.timestamp,
        costCents,
    };
}
