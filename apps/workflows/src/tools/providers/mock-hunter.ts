/**
 * Mock Hunter Provider
 *
 * Simulates Hunter.io email lookup.
 * Tier: CHEAP
 */

import { BaseProvider } from "../interfaces";
import type {
    EnrichmentFieldKey,
    NormalizedInput,
    ProviderResult,
    ProviderTier,
} from "../../types/enrichment";

// Simple hash for deterministic mock data
function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export class MockHunterProvider extends BaseProvider {
    name = "mock_hunter";
    tier: ProviderTier = "cheap";
    costCents = 3;
    protected supportedFields: EnrichmentFieldKey[] = ["emailCandidates", "name"];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        if (!this.canEnrich(field)) return null;

        const seed = `${input.rowId}-${field}`;
        const hash = hashString(seed);

        if (field === "emailCandidates") {
            const domain = input.domain || "example.com";
            const firstName = input.name?.split(" ")[0]?.toLowerCase() || "john";
            const lastName = input.name?.split(" ")[1]?.toLowerCase() || "doe";

            const patterns = [
                `${firstName}.${lastName}@${domain}`,
                `${firstName[0]}${lastName}@${domain}`,
                `${firstName}@${domain}`,
            ];

            const selectedEmail = patterns[hash % patterns.length];
            const confidence = 0.7 + (hash % 20) / 100; // 0.70 - 0.90

            return this.createResult(field, [selectedEmail!], confidence, {
                provider: "mock_hunter",
                patternsChecked: patterns.length,
            });
        }

        if (field === "name" && input.email) {
            // Extract name from email
            const localPart = input.email.split("@")[0] || "";
            const nameParts = localPart.split(/[._-]/);
            const name = nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
            return this.createResult(field, name, 0.6, { provider: "mock_hunter" });
        }

        return null;
    }
}

export const mockHunterProvider = new MockHunterProvider();
