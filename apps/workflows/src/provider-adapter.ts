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

            // Normalize field names from column keys to standard field keys
            // Common patterns: "COMPANY NAME" -> "company", "WEBSITE" -> "domain"
            const normalizeFieldKey = (key: string): string => {
                const lowerKey = key.toLowerCase().replace(/\s+/g, '_');
                // Map common column names to standard field names
                if (lowerKey === 'company_name' || lowerKey === 'company') return 'company';
                if (lowerKey === 'website' || lowerKey === 'domain') return 'domain';
                if (lowerKey === 'linkedin' || lowerKey === 'linkedin_url') return 'linkedinUrl';
                if (lowerKey === 'email' || lowerKey === 'email_address') return 'email';
                if (lowerKey === 'name' || lowerKey === 'person_name' || lowerKey === 'full_name') return 'name';
                return lowerKey;
            };

            // Build normalized data with normalized keys
            const normalizedData: Record<string, unknown> = {};
            if (existingData) {
                for (const [key, value] of Object.entries(existingData)) {
                    const normalizedKey = normalizeFieldKey(key);
                    normalizedData[normalizedKey] = value;
                }
            }

            // Extract domain from website URL if present
            let domain = normalizedData.domain as string | undefined;
            if (domain && domain.includes('http')) {
                try {
                    const url = new URL(domain);
                    domain = url.hostname.replace(/^www\./, '');
                    normalizedData.domain = domain;
                } catch {
                    // Invalid URL, keep original
                }
            }

            // Build NormalizedInput from params
            const normalizedInput: NormalizedInput = {
                rowId,
                tableId: (context?.tableId as string) || 'unknown',
                raw: existingData || {},
                name: normalizedData.name as string | undefined,
                domain: domain,
                linkedinUrl: normalizedData.linkedinUrl as string | undefined,
                email: normalizedData.email as string | undefined,
                company: normalizedData.company as string | undefined,
            };

            logger.info('🔌 Real provider enrichment', {
                provider: provider.name,
                field,
                hasCompany: !!normalizedInput.company,
                hasDomain: !!normalizedInput.domain,
                hasName: !!normalizedInput.name,
                normalizedDataKeys: Object.keys(normalizedData),
            });

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
