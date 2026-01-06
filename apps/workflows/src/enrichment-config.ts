/**
 * Enrichment Configuration
 * 
 * Controls enrichment behavior including mock mode, budgets, and thresholds.
 */

export const enrichmentConfig = {
    // Mock mode - set to false when ready for real providers
    useMockProviders: true,

    // Budget controls
    maxCostPerCellCents: 50,

    // Provider enablement (for when we switch to real providers)
    enableWebsiteScraper: true,
    enableSearch: false,      // Will be true when API key is added
    enableLinkedIn: false,    // Will be true when API key is added
    enableAIAgent: false,     // Will be true when AI SDK + Groq is integrated

    // Thresholds
    confidenceThreshold: 0.7, // Minimum confidence to accept

    // Waterfall strategy order
    waterfallStages: ['cache', 'free', 'cheap', 'premium'] as const,

    // Retry settings
    maxRetries: 3,
    retryDelayMs: 1000,

    // Mock provider delays (milliseconds)
    mockDelays: {
        websiteScrape: { min: 500, max: 1500 },
        search: { min: 300, max: 800 },
        linkedIn: { min: 800, max: 2000 },
        aiAgent: { min: 1000, max: 3000 },
    },
};

export type WaterfallStage = typeof enrichmentConfig.waterfallStages[number];
