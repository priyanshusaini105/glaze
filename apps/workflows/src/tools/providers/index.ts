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

// Free Providers (0x cost)
import { wikipediaProvider } from "./wikipedia-provider";
import { openCorporatesProvider } from "./opencorporates-provider";

// Cheap Providers (1-2x cost)
import { prospeoProvider } from "./prospeo-provider";

// Smart Enrichment Provider (3-layer verified workflow)
import { smartEnrichmentProvider } from "../smart-enrichment";

// Re-export real providers
export { serperProvider, SerperProvider } from "./serper-provider";
export { linkedInProvider, LinkedInProvider } from "./linkedin-provider";
export { githubProvider, GitHubProvider } from "./github-provider";
export { companyScraperProvider, CompanyScraperProvider } from "./company-scraper";
export { wikipediaProvider, WikipediaProvider } from "./wikipedia-provider";
export { openCorporatesProvider, OpenCorporatesProvider } from "./opencorporates-provider";
export { prospeoProvider, ProspeoProvider } from "./prospeo-provider";
export { smartEnrichmentProvider, SmartEnrichmentProvider } from "../smart-enrichment";

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
 * 
 * Smart Enrichment is prioritized for domain/industry as it uses
 * the 3-layer verification workflow (candidate collection → verification → decision)
 */
export const realProviders: ProviderToolInterface[] = [
    // Free tier (0x cost)
    githubProvider,           // 0¢ - Free GitHub API (5000 req/hr with token)
    wikipediaProvider,        // 0¢ - Wikipedia/Wikidata (unlimited)
    openCorporatesProvider,   // 0¢ - Corporate registry (generous limits)
    companyScraperProvider,   // 0¢ - Website scraping

    // Cheap tier (1-2x cost) - Smart Enrichment first!
    smartEnrichmentProvider,  // 2¢ - 3-layer verified enrichment (Serper + verification)
    serperProvider,           // 1¢ - SERP discovery (2500/mo free)
    prospeoProvider,          // 1¢ - Email finder (75/mo free)

    // Premium tier (3x+ cost)
    linkedInProvider,         // 2-5¢ - LinkedIn API (RapidAPI)
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

