/**
 * OpenCorporates Provider
 * 
 * FREE (with generous limits) - Corporate registry data
 * 
 * Provides:
 * - Official company name
 * - Registration details
 * - Jurisdiction
 * - Company status
 * - Officers (in some jurisdictions)
 * 
 * Cost: $0 (free tier with rate limits)
 */

import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult, ProviderTier } from "../../types/enrichment";
import { BaseProvider } from "../interfaces";

const OPENCORPORATES_API = "https://api.opencorporates.com/v0.4";

interface OpenCorporatesCompany {
    name: string;
    company_number: string;
    jurisdiction_code: string;
    incorporation_date: string;
    dissolution_date: string | null;
    company_type: string;
    registry_url: string;
    branch: string | null;
    branch_status: string | null;
    inactive: boolean;
    current_status: string;
    created_at: string;
    updated_at: string;
    opencorporates_url: string;
    previous_names: Array<{ company_name: string }>;
    source: { publisher: string; url: string };
    registered_address_in_full: string;
    industry_codes: Array<{ code: string; description: string }>;
}

interface OpenCorporatesSearchResult {
    company: OpenCorporatesCompany;
    score: number;
}

/**
 * Search for companies
 */
async function searchCompanies(query: string): Promise<OpenCorporatesSearchResult[]> {
    try {
        const params = new URLSearchParams({
            q: query,
            per_page: "5",
        });

        const response = await fetch(`${OPENCORPORATES_API}/companies/search?${params}`, {
            headers: {
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            if (response.status === 429) {
                logger.warn("OpenCorporates rate limited");
            }
            return [];
        }

        const data = await response.json();
        return data.results?.companies || [];
    } catch (error) {
        logger.error("OpenCorporates search failed", { error, query });
        return [];
    }
}

/**
 * Get company details
 */
async function getCompany(jurisdictionCode: string, companyNumber: string): Promise<OpenCorporatesCompany | null> {
    try {
        const response = await fetch(
            `${OPENCORPORATES_API}/companies/${jurisdictionCode}/${companyNumber}`,
            {
                headers: {
                    "Accept": "application/json",
                },
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        return data.results?.company || null;
    } catch (error) {
        logger.error("OpenCorporates get company failed", { error });
        return null;
    }
}

/**
 * Search by domain (try to find company name from domain)
 */
function domainToCompanyName(domain: string): string {
    // Remove TLD and clean up
    const parts = domain.split(".");
    if (parts.length >= 2) {
        // Take the main part (before TLD)
        const mainPart = parts[parts.length - 2] ?? domain;
        // Convert to title case and remove hyphens
        return mainPart
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
    }
    return domain;
}

export class OpenCorporatesProvider extends BaseProvider {
    name = "opencorporates";
    tier: ProviderTier = "free";
    costCents = 0;

    protected supportedFields: EnrichmentFieldKey[] = [
        "company",
        "industry",
        "foundedDate",
        "location",
    ];

    async enrich(input: NormalizedInput, field: EnrichmentFieldKey): Promise<ProviderResult | null> {
        // Determine search term
        let searchTerm = input.company;
        
        if (!searchTerm && input.domain) {
            searchTerm = domainToCompanyName(input.domain);
        }
        
        if (!searchTerm) return null;

        logger.info("🏢 OpenCorporates: Searching", { searchTerm, field });

        try {
            const results = await searchCompanies(searchTerm);
            if (results.length === 0) return null;

            // Get the best match
            const bestMatch = results[0];
            if (!bestMatch) return null;
            
            const company = bestMatch.company;

            // Calculate confidence based on match score and name similarity
            const nameSimilarity = this.calculateSimilarity(
                searchTerm.toLowerCase(),
                company.name.toLowerCase()
            );
            const confidence = Math.min(0.9, (bestMatch.score / 100) * nameSimilarity);

            return this.extractField(company, field, confidence);
        } catch (error) {
            logger.error("OpenCorporates enrichment failed", { error, searchTerm });
            return null;
        }
    }

    private calculateSimilarity(a: string, b: string): number {
        // Simple word overlap similarity
        const wordsA = new Set(a.split(/\s+/));
        const wordsB = new Set(b.split(/\s+/));
        const intersection = [...wordsA].filter(w => wordsB.has(w));
        const union = new Set([...wordsA, ...wordsB]);
        return intersection.length / union.size;
    }

    private extractField(
        company: OpenCorporatesCompany,
        field: EnrichmentFieldKey,
        confidence: number
    ): ProviderResult | null {
        let value: string | null = null;

        switch (field) {
            case "company":
                value = company.name;
                break;
            case "industry":
                if (company.industry_codes && company.industry_codes.length > 0) {
                    const firstCode = company.industry_codes[0];
                    value = firstCode?.description ?? null;
                }
                break;
            case "foundedDate":
                if (company.incorporation_date) {
                    value = company.incorporation_date;
                }
                break;
            case "location":
                if (company.registered_address_in_full) {
                    value = company.registered_address_in_full;
                } else if (company.jurisdiction_code) {
                    // Convert jurisdiction code to readable format
                    value = company.jurisdiction_code.toUpperCase().replace("_", " ");
                }
                break;
        }

        if (value === null) return null;

        return {
            field,
            value,
            confidence,
            source: "opencorporates",
            raw: company,
            timestamp: new Date().toISOString(),
            costCents: 0,
        };
    }
}

export const openCorporatesProvider = new OpenCorporatesProvider();
