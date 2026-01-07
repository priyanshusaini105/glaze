/**
 * Provider Registry
 *
 * Central registry of all available providers.
 * Supports both mock providers (for testing) and real providers (for production).
 */

import type { ProviderToolInterface, ProviderTier } from "../../types/enrichment";
import { enrichmentConfig } from "../../enrichment-config";

// Mock Providers
import { mockHunterProvider } from "./mock-hunter";
import { mockLinkedInProvider } from "./mock-linkedin";
import { mockOpenCorporatesProvider } from "./mock-opencorporates";
import { mockGitHubProvider } from "./mock-github";

// Real Providers (Agentic)
import { serperProvider } from "./serper-provider";
import { linkedInProvider } from "./linkedin-provider";
import { githubProvider } from "./github-provider";
import { companyScraperProvider } from "./company-scraper";

// Re-export real providers
export { serperProvider, SerperProvider } from "./serper-provider";
export { linkedInProvider, LinkedInProvider } from "./linkedin-provider";
export { githubProvider, GitHubProvider } from "./github-provider";
export { companyScraperProvider, CompanyScraperProvider } from "./company-scraper";

/**
 * Mock providers (for development/testing)
 */
export const mockProviders: ProviderToolInterface[] = [
    mockOpenCorporatesProvider, // Free
    mockGitHubProvider, // Free
    mockHunterProvider, // Cheap
    mockLinkedInProvider, // Premium
];

/**
 * Real providers (for production)
 * Ordered by tier: free → cheap → premium
 */
export const realProviders: ProviderToolInterface[] = [
    // Free tier
    githubProvider,        // 0¢ - Free GitHub API
    companyScraperProvider, // 0¢ - Website scraping
    
    // Cheap tier
    serperProvider,        // 1¢ - SERP discovery
    
    // Premium tier
    linkedInProvider,      // 2-5¢ - LinkedIn API
];

/**
 * All registered providers based on configuration.
 */
export const providers: ProviderToolInterface[] = enrichmentConfig.useMockProviders
    ? mockProviders
    : realProviders;

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

/**
 * Provider lookup map (for quick access)
 */
export const PROVIDER_MAP = enrichmentConfig.useMockProviders
    ? {
        mock_hunter: mockHunterProvider,
        mock_linkedin: mockLinkedInProvider,
        mock_opencorporates: mockOpenCorporatesProvider,
        mock_github: mockGitHubProvider,
    }
    : {
        serper: serperProvider,
        linkedin_api: linkedInProvider,
        github: githubProvider,
        company_scraper: companyScraperProvider,
    };

