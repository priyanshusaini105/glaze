/**
 * Mock LinkedIn Provider
 *
 * Simulates LinkedIn profile lookup.
 * Tier: PREMIUM
 */

import { BaseProvider } from "../interfaces";
import type {
    EnrichmentFieldKey,
    NormalizedInput,
    ProviderResult,
    ProviderTier,
} from "../../types/enrichment";

const TITLES = [
    "CEO",
    "CTO",
    "VP of Engineering",
    "Head of Product",
    "Director of Sales",
    "Chief Data Officer",
    "VP of Marketing",
    "Engineering Manager",
    "Senior Software Engineer",
    "Product Manager",
];

const LOCATIONS = [
    "San Francisco, CA",
    "New York, NY",
    "Austin, TX",
    "Seattle, WA",
    "Boston, MA",
    "Denver, CO",
    "Chicago, IL",
    "Los Angeles, CA",
];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export class MockLinkedInProvider extends BaseProvider {
    name = "mock_linkedin";
    tier: ProviderTier = "premium";
    costCents = 10;
    protected supportedFields: EnrichmentFieldKey[] = [
        "name",
        "title",
        "company",
        "location",
        "socialLinks",
    ];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        if (!this.canEnrich(field)) return null;

        const seed = `${input.rowId}-${field}`;
        const hash = hashString(seed);

        switch (field) {
            case "name": {
                if (input.name) {
                    return this.createResult(field, input.name, 0.95, {
                        provider: "mock_linkedin",
                    });
                }
                return this.createResult(field, `Profile User ${input.rowId.slice(0, 4)}`, 0.7);
            }

            case "title": {
                const title = TITLES[hash % TITLES.length];
                return this.createResult(field, title!, 0.9);
            }

            case "company": {
                if (input.company) {
                    return this.createResult(field, input.company, 0.95);
                }
                return this.createResult(field, `Company ${hash % 1000}`, 0.6);
            }

            case "location": {
                const location = LOCATIONS[hash % LOCATIONS.length];
                return this.createResult(field, location!, 0.85);
            }

            case "socialLinks": {
                const linkedinUrl =
                    input.linkedinUrl || `https://linkedin.com/in/user-${input.rowId.slice(0, 8)}`;
                return this.createResult(field, [linkedinUrl], 0.9);
            }

            default:
                return null;
        }
    }
}

export const mockLinkedInProvider = new MockLinkedInProvider();
