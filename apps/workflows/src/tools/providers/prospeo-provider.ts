/**
 * Prospeo Email Finder Provider
 * 
 * Cost: 1.5x (75 credits/month free)
 * Better free tier than Hunter
 * 
 * Finds professional email addresses
 */

import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult, ProviderTier } from "../../types/enrichment";
import { BaseProvider } from "../interfaces";

const PROSPEO_API_KEY = process.env.PROSPEO_API_KEY;
const PROSPEO_API_URL = "https://api.prospeo.io/email-finder";

interface ProspeoEmailResponse {
    email: string;
    email_status: "valid" | "invalid" | "catch_all" | "unknown";
    confidence_score: number;
    first_name: string;
    last_name: string;
    domain: string;
}

/**
 * Find email using Prospeo API
 */
async function findEmail(
    firstName: string,
    lastName: string,
    domain: string
): Promise<ProspeoEmailResponse | null> {
    if (!PROSPEO_API_KEY) {
        logger.warn("Prospeo API key not configured");
        return null;
    }

    try {
        const response = await fetch(PROSPEO_API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-KEY": PROSPEO_API_KEY,
            },
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                domain: domain,
            }),
        });

        if (!response.ok) {
            if (response.status === 429) {
                logger.warn("Prospeo rate limited (free tier exhausted?)");
            }
            return null;
        }

        const data = await response.json();
        return data.response || null;
    } catch (error) {
        logger.error("Prospeo API call failed", { error });
        return null;
    }
}

export class ProspeoProvider extends BaseProvider {
    name = "prospeo";
    tier: ProviderTier = "cheap";
    costCents = 1; // Effectively ~1 cent per lookup

    protected supportedFields: EnrichmentFieldKey[] = ["email", "emailCandidates"];

    async enrich(input: NormalizedInput, field: EnrichmentFieldKey): Promise<ProviderResult | null> {
        if (field !== "email" && field !== "emailCandidates") return null;
        
        // Need name and domain/company
        if (!input.name || (!input.domain && !input.company)) {
            return null;
        }

        // Parse name
        const nameParts = input.name.trim().split(/\s+/);
        if (nameParts.length < 2) return null;

        const firstName = nameParts[0] ?? "";
        const lastName = nameParts[nameParts.length - 1] ?? "";
        
        // Get domain from company if needed
        const domain = input.domain || `${input.company?.toLowerCase().replace(/\s+/g, "")}.com`;
        if (!domain) return null;

        logger.info("📧 Prospeo: Finding email", { firstName, lastName, domain });

        try {
            const result = await findEmail(firstName, lastName, domain);
            if (!result || !result.email) return null;

            // Convert status to confidence
            let confidence = result.confidence_score / 100;
            if (result.email_status === "valid") {
                confidence = Math.max(confidence, 0.9);
            } else if (result.email_status === "catch_all") {
                confidence = Math.min(confidence, 0.6);
            } else if (result.email_status === "invalid") {
                return null;
            }

            return {
                field: "email",
                value: result.email,
                confidence,
                source: "prospeo",
                raw: result,
                timestamp: new Date().toISOString(),
                costCents: this.costCents,
            };
        } catch (error) {
            logger.error("Prospeo enrichment failed", { error });
            return null;
        }
    }
}

export const prospeoProvider = new ProspeoProvider();
