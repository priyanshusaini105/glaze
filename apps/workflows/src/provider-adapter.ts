/**
 * Provider Adapter
 * 
 * Adapts the real ProviderToolInterface to work with the mock provider interface
 * used by enrichment-service-v2.ts. This allows the system to use real providers
 * when useMockProviders is false in the config.
 */

import { enrichmentConfig } from './enrichment-config';
import type {
    EnrichmentFieldKey,
    NormalizedInput,
    ProviderResult,
    ProviderTier,
    ProviderToolInterface,
} from './types/enrichment';
import {
    providers as realProviders,
    getProvidersByTier as getRealProvidersByTier,
} from './tools/providers';
import {
    mockProviders as legacyMockProviders,
    getProvidersForTier as getLegacyMockProvidersForTier,
    type EnrichmentData,
    type EnrichedValue,
    type MockProvider,
    type EnrichParams,
} from './mock-providers';
import { logger } from '@trigger.dev/sdk';

/**
 * Unified provider interface that works with both mock and real providers
 */
export interface UnifiedProvider {
    name: string;
    costCents: number;
    tier: ProviderTier;
    canEnrich(field: string): boolean;
    enrich(params: EnrichParams): Promise<EnrichmentData>;
}

/**
 * Wrap a real ProviderToolInterface to work with the mock provider interface
 */
function wrapRealProvider(provider: ProviderToolInterface): UnifiedProvider {
    return {
        name: provider.name,
        costCents: provider.costCents,
        tier: provider.tier,
        canEnrich(field: string): boolean {
            return provider.canEnrich(field as EnrichmentFieldKey);
        },
        async enrich(params: EnrichParams): Promise<EnrichmentData> {
            const { field, rowId, existingData, context } = params;

            // Build NormalizedInput from params
            const normalizedInput: NormalizedInput = {
                rowId,
                tableId: (context?.tableId as string) || 'unknown',
                raw: existingData || {},
                name: existingData?.name as string | undefined,
                domain: existingData?.domain as string | undefined,
                linkedinUrl: existingData?.linkedinUrl as string | undefined,
                email: existingData?.email as string | undefined,
                company: existingData?.company as string | undefined,
            };

            try {
                const result = await provider.enrich(normalizedInput, field as EnrichmentFieldKey);

                if (!result) {
                    // Return empty data if provider returns null
                    return {};
                }

                // Convert ProviderResult to EnrichmentData format
                const enrichedValue: EnrichedValue = {
                    value: result.value as string | number | null,
                    confidence: result.confidence,
                    source: result.source,
                    timestamp: result.timestamp,
                    metadata: {
                        provider: provider.name,
                        tier: provider.tier,
                        costCents: result.costCents,
                        raw: result.raw,
                        verified: result.verified,
                    },
                };

                return {
                    [field]: enrichedValue,
                };
            } catch (error) {
                logger.error('Real provider error', {
                    provider: provider.name,
                    field,
                    error: error instanceof Error ? error.message : String(error),
                });
                throw error;
            }
        },
    };
}

/**
 * Wrap a legacy MockProvider to match the UnifiedProvider interface
 */
function wrapMockProvider(provider: MockProvider): UnifiedProvider {
    return {
        name: provider.name,
        costCents: provider.costCents,
        tier: provider.tier,
        canEnrich: provider.canEnrich.bind(provider),
        enrich: provider.enrich.bind(provider),
    };
}

/**
 * Get unified providers based on config
 */
export function getUnifiedProviders(): UnifiedProvider[] {
    if (enrichmentConfig.useMockProviders) {
        logger.info('📦 Using MOCK providers (useMockProviders=true)');
        return legacyMockProviders.map(wrapMockProvider);
    } else {
        logger.info('🌐 Using REAL providers (useMockProviders=false)');
        return realProviders.map(wrapRealProvider);
    }
}

/**
 * Get unified providers for a specific tier
 */
export function getUnifiedProvidersForTier(tier: ProviderTier): UnifiedProvider[] {
    if (enrichmentConfig.useMockProviders) {
        return getLegacyMockProvidersForTier(tier as 'free' | 'cheap' | 'premium').map(wrapMockProvider);
    } else {
        return getRealProvidersByTier(tier).map(wrapRealProvider);
    }
}

// Re-export types for convenience
export type { EnrichmentData, EnrichedValue, EnrichParams };
