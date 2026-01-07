/**
 * Provider Interface & Base Classes
 *
 * Defines the contract for all enrichment providers.
 */

import type {
    EnrichmentFieldKey,
    NormalizedInput,
    ProviderResult,
    ProviderTier,
    ProviderToolInterface,
} from "../types/enrichment";

/**
 * Abstract base class for providers.
 * Provides common functionality like rate limiting and caching checks.
 */
export abstract class BaseProvider implements ProviderToolInterface {
    abstract name: string;
    abstract tier: ProviderTier;
    abstract costCents: number;
    protected abstract supportedFields: EnrichmentFieldKey[];

    canEnrich(field: EnrichmentFieldKey): boolean {
        return this.supportedFields.includes(field);
    }

    abstract enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null>;

    /**
     * Helper to create a standardized ProviderResult.
     */
    protected createResult(
        field: EnrichmentFieldKey,
        value: string | number | string[] | null,
        confidence: number,
        raw?: unknown
    ): ProviderResult {
        return {
            field,
            value,
            confidence,
            source: this.name,
            costCents: this.costCents,
            timestamp: new Date().toISOString(),
            raw,
        };
    }
}
