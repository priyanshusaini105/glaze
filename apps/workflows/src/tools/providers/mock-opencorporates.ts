/**
 * Mock OpenCorporates Provider
 *
 * Simulates company registry lookup.
 * Tier: FREE
 */

import { BaseProvider } from "../interfaces";
import type {
    EnrichmentFieldKey,
    NormalizedInput,
    ProviderResult,
    ProviderTier,
} from "../../types/enrichment";

const INDUSTRIES = [
    "Technology",
    "Software",
    "SaaS",
    "FinTech",
    "HealthTech",
    "E-commerce",
    "AI/ML",
    "Cloud Computing",
    "Cybersecurity",
    "Data Analytics",
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export class MockOpenCorporatesProvider extends BaseProvider {
    name = "mock_opencorporates";
    tier: ProviderTier = "free";
    costCents = 0;
    protected supportedFields: EnrichmentFieldKey[] = [
        "company",
        "companySize",
        "companySummary",
        "foundedDate",
    ];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        if (!this.canEnrich(field)) return null;

        const seed = `${input.rowId}-${field}`;
        const hash = hashString(seed);

        switch (field) {
            case "company": {
                if (input.company) {
                    // Normalize company name
                    const normalized = input.company
                        .replace(/\s+(inc|llc|ltd|corp)\.?$/i, "")
                        .trim();
                    return this.createResult(field, `${normalized}, Inc.`, 0.9);
                }
                if (input.domain) {
                    // Extract from domain
                    const name = input.domain.split(".")[0];
                    const capitalized = name!.charAt(0).toUpperCase() + name!.slice(1);
                    return this.createResult(field, `${capitalized}, Inc.`, 0.75);
                }
                return null;
            }

            case "companySize": {
                const size = COMPANY_SIZES[hash % COMPANY_SIZES.length];
                return this.createResult(field, size!, 0.7);
            }

            case "companySummary": {
                const industry = INDUSTRIES[hash % INDUSTRIES.length];
                return this.createResult(
                    field,
                    `A ${industry} company based in the United States, providing innovative solutions to enterprise customers.`,
                    0.65
                );
            }

            case "foundedDate": {
                const year = 2010 + (hash % 14);
                return this.createResult(field, year, 0.8);
            }

            default:
                return null;
        }
    }
}

export const mockOpenCorporatesProvider = new MockOpenCorporatesProvider();
