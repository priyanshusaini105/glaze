/**
 * Mock GitHub Provider
 *
 * Simulates GitHub profile lookup (useful for dev-focused enrichment).
 * Tier: FREE
 */

import { BaseProvider } from "../interfaces";
import type {
    EnrichmentFieldKey,
    NormalizedInput,
    ProviderResult,
    ProviderTier,
} from "../../types/enrichment";

function hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export class MockGitHubProvider extends BaseProvider {
    name = "mock_github";
    tier: ProviderTier = "free";
    costCents = 0;
    protected supportedFields: EnrichmentFieldKey[] = ["name", "shortBio", "socialLinks"];

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
                    return this.createResult(field, input.name, 0.85, {
                        provider: "mock_github",
                    });
                }
                return this.createResult(field, `Developer ${hash % 1000}`, 0.5);
            }

            case "shortBio": {
                const bios = [
                    "Full-stack developer passionate about open source.",
                    "Building the future of software, one commit at a time.",
                    "Software engineer | OSS contributor | Tech enthusiast",
                    "Making the web a better place through code.",
                ];
                return this.createResult(field, bios[hash % bios.length]!, 0.7);
            }

            case "socialLinks": {
                const username = `user-${input.rowId.slice(0, 6)}`;
                return this.createResult(field, [`https://github.com/${username}`], 0.85);
            }

            default:
                return null;
        }
    }
}

export const mockGitHubProvider = new MockGitHubProvider();
