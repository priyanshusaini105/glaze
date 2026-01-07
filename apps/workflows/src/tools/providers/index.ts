/**
 * Provider Registry
 *
 * Central registry of all available providers.
 */

import type { ProviderToolInterface, ProviderTier } from "../../types/enrichment";
import { mockHunterProvider } from "./mock-hunter";
import { mockLinkedInProvider } from "./mock-linkedin";
import { mockOpenCorporatesProvider } from "./mock-opencorporates";
import { mockGitHubProvider } from "./mock-github";

/**
 * All registered providers.
 */
export const providers: ProviderToolInterface[] = [
    mockOpenCorporatesProvider, // Free
    mockGitHubProvider, // Free
    mockHunterProvider, // Cheap
    mockLinkedInProvider, // Premium
];

/**
 * Get providers by tier.
 */
export function getProvidersByTier(tier: ProviderTier): ProviderToolInterface[] {
    return providers.filter((p) => p.tier === tier);
}

/**
 * Get all providers that can enrich a specific field.
 */
export function getProvidersForField(field: string): ProviderToolInterface[] {
    return providers.filter((p) => p.canEnrich(field as never));
}

/**
 * Get a provider by name.
 */
export function getProviderByName(name: string): ProviderToolInterface | undefined {
    return providers.find((p) => p.name === name);
}
