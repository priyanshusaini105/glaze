/**
 * Mock Data Providers for Enrichment
 * 
 * These providers simulate real API calls with:
 * - Realistic delays
 * - Confidence scores
 * - Cost tracking
 * - Deterministic but varied data
 * 
 * When ready for real providers, swap these for real implementations.
 */

import { enrichmentConfig } from './enrichment-config';

// ============ Types ============

export interface EnrichmentField {
    key: string;
    type: 'company' | 'person' | 'generic';
}

export interface EnrichedValue {
    value: string | number | null;
    confidence: number;
    source: string;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

export interface EnrichmentData {
    [fieldKey: string]: EnrichedValue;
}

export interface EnrichParams {
    field: string;
    rowId: string;
    context?: Record<string, unknown>;
}

export interface MockProvider {
    name: string;
    costCents: number;
    tier: 'free' | 'cheap' | 'premium';
    canEnrich(field: string): boolean;
    enrich(params: EnrichParams): Promise<EnrichmentData>;
}

// ============ Helpers ============

/**
 * Simple hash for deterministic data generation
 */
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Simulate network delay
 */
// No-op delay function - removed artificial delays for fast enrichment
async function simulateDelay(_min: number, _max: number): Promise<void> {
    // Delays removed for performance
    return;
}

/**
 * Generate confidence score within a range
 */
function generateConfidence(min: number, max: number, seed: string): number {
    const hash = hashString(seed);
    return min + (hash % 100) / 100 * (max - min);
}

// ============ Mock Data Generators ============

const COMPANY_NAMES = [
    'TechVenture Inc', 'DataFlow Systems', 'CloudScale Solutions',
    'InnovateLab Corp', 'NextGen Analytics', 'Quantum Computing Ltd',
    'AI Dynamics', 'BlockChain Ventures', 'CyberSec Pro', 'DevOps Hub'
];

const INDUSTRIES = [
    'Technology', 'Software', 'SaaS', 'FinTech', 'HealthTech',
    'E-commerce', 'AI/ML', 'Cloud Computing', 'Cybersecurity', 'Data Analytics'
];

const LOCATIONS = [
    'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
    'Boston, MA', 'Denver, CO', 'Chicago, IL', 'Los Angeles, CA',
    'Miami, FL', 'Portland, OR'
];

const TITLES = [
    'CEO', 'CTO', 'VP of Engineering', 'Head of Product', 'Director of Sales',
    'Chief Data Officer', 'VP of Marketing', 'Engineering Manager',
    'Senior Software Engineer', 'Product Manager'
];

function generateMockValue(field: string, rowId: string): string | number {
    const seed = field + rowId;
    const hash = hashString(seed);
    const key = field.toLowerCase();

    if (key.includes('name') && key.includes('company')) {
        return COMPANY_NAMES[hash % COMPANY_NAMES.length]!;
    }
    if (key.includes('industry')) {
        return INDUSTRIES[hash % INDUSTRIES.length]!;
    }
    if (key.includes('location') || key.includes('city') || key.includes('hq')) {
        return LOCATIONS[hash % LOCATIONS.length]!;
    }
    if (key.includes('title') || key.includes('position')) {
        return TITLES[hash % TITLES.length]!;
    }
    if (key.includes('employee') || key.includes('size')) {
        return 50 + (hash % 5000);
    }
    if (key.includes('revenue')) {
        return `$${1 + (hash % 100)}M`;
    }
    if (key.includes('email')) {
        return `contact-${rowId.slice(0, 6)}@example.com`;
    }
    if (key.includes('phone')) {
        return `+1-555-${String(hash % 10000).padStart(4, '0')}`;
    }
    if (key.includes('linkedin')) {
        return `https://linkedin.com/company/mock-${rowId.slice(0, 8)}`;
    }
    if (key.includes('website') || key.includes('url')) {
        return `https://mock-${rowId.slice(0, 6)}.example.com`;
    }
    if (key.includes('founded') || key.includes('year')) {
        return 2010 + (hash % 15);
    }
    if (key.includes('description') || key.includes('bio')) {
        return `Mock description for ${field}. This is sample enriched data for testing purposes.`;
    }

    // Default
    return `Enriched: ${field} (${rowId.slice(0, 8)})`;
}

// ============ Mock Providers ============

/**
 * Mock Website Scraper Provider
 * Tier: FREE
 * Simulates scraping company websites
 */
export const mockWebsiteScraper: MockProvider = {
    name: 'website_scrape',
    costCents: 0,
    tier: 'free',

    canEnrich(field: string): boolean {
        const key = field.toLowerCase();
        return key.includes('company') ||
            key.includes('website') ||
            key.includes('description') ||
            key.includes('industry');
    },

    async enrich(params: EnrichParams): Promise<EnrichmentData> {
        // No delay - instant mock response
        const value = generateMockValue(params.field, params.rowId);
        const confidence = generateConfidence(0.75, 0.90, params.field + params.rowId);

        return {
            [params.field]: {
                value,
                confidence,
                source: 'website_scrape',
                timestamp: new Date().toISOString(),
                metadata: { provider: 'mock', tier: 'free' },
            },
        };
    },
};

/**
 * Mock Search/SERP Provider
 * Tier: CHEAP
 * Simulates Google search enrichment
 */
export const mockSearchProvider: MockProvider = {
    name: 'search_result',
    costCents: 3, // ~3 cents per search
    tier: 'cheap',

    canEnrich(field: string): boolean {
        const key = field.toLowerCase();
        return key.includes('company') ||
            key.includes('funding') ||
            key.includes('revenue') ||
            key.includes('employee');
    },

    async enrich(params: EnrichParams): Promise<EnrichmentData> {
        // No delay - instant mock response
        const value = generateMockValue(params.field, params.rowId);
        const confidence = generateConfidence(0.80, 0.92, params.field + params.rowId);

        return {
            [params.field]: {
                value,
                confidence,
                source: 'search_result',
                timestamp: new Date().toISOString(),
                metadata: { provider: 'mock', tier: 'cheap', queries: 1 },
            },
        };
    },
};

/**
 * Mock LinkedIn Provider
 * Tier: PREMIUM
 * Simulates LinkedIn API calls
 */
export const mockLinkedInProvider: MockProvider = {
    name: 'linkedin_api',
    costCents: 10, // ~10 cents per lookup
    tier: 'premium',

    canEnrich(field: string): boolean {
        const key = field.toLowerCase();
        return key.includes('person') ||
            key.includes('title') ||
            key.includes('linkedin') ||
            key.includes('company') ||
            key.includes('employee');
    },

    async enrich(params: EnrichParams): Promise<EnrichmentData> {
        // No delay - instant mock response
        const value = generateMockValue(params.field, params.rowId);
        const confidence = generateConfidence(0.88, 0.98, params.field + params.rowId);

        return {
            [params.field]: {
                value,
                confidence,
                source: 'linkedin_api',
                timestamp: new Date().toISOString(),
                metadata: { provider: 'mock', tier: 'premium' },
            },
        };
    },
};

/**
 * Mock AI Agent Provider (Future)
 * Tier: CHEAP (but versatile)
 * Will use AI SDK + Groq in real implementation
 */
export const mockAIAgentProvider: MockProvider = {
    name: 'ai_agent',
    costCents: 2, // ~2 cents per inference
    tier: 'cheap',

    canEnrich(field: string): boolean {
        // AI can attempt any field
        return true;
    },

    async enrich(params: EnrichParams): Promise<EnrichmentData> {
        // No delay - instant mock response
        const value = generateMockValue(params.field, params.rowId);
        // AI confidence now meets threshold
        const confidence = generateConfidence(0.75, 0.88, params.field + params.rowId);

        return {
            [params.field]: {
                value,
                confidence,
                source: 'ai_agent',
                timestamp: new Date().toISOString(),
                metadata: {
                    provider: 'mock',
                    tier: 'cheap',
                    model: 'mock-llm',
                    note: 'AI SDK + Groq to be integrated',
                },
            },
        };
    },
};

// ============ Provider Registry ============

export const mockProviders: MockProvider[] = [
    mockWebsiteScraper,
    mockSearchProvider,
    mockLinkedInProvider,
    mockAIAgentProvider,
];

/**
 * Get providers for a specific waterfall tier
 */
export function getProvidersForTier(tier: 'free' | 'cheap' | 'premium'): MockProvider[] {
    return mockProviders.filter((p) => p.tier === tier);
}

/**
 * Get the best provider for a specific field
 */
export function getBestProviderForField(field: string): MockProvider | null {
    // Try free first, then cheap, then premium
    for (const tier of ['free', 'cheap', 'premium'] as const) {
        const providers = getProvidersForTier(tier);
        const capable = providers.find((p) => p.canEnrich(field));
        if (capable) return capable;
    }
    return null;
}
