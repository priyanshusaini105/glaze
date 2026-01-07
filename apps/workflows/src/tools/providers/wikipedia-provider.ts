/**
 * Wikipedia/Wikidata Provider
 * 
 * FREE - Uses Wikipedia and Wikidata APIs for:
 * - Company information
 * - Person biographical data
 * - Founded dates, headquarters, etc.
 * 
 * Cost: $0 (completely free)
 */

import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult, ProviderTier } from "../../types/enrichment";
import { BaseProvider } from "../interfaces";

const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

interface WikipediaSearchResult {
    title: string;
    pageid: number;
    snippet: string;
}

interface WikipediaPage {
    title: string;
    extract: string;
    fullurl: string;
}

interface WikidataEntity {
    id: string;
    labels: Record<string, { value: string }>;
    descriptions: Record<string, { value: string }>;
    claims: Record<string, any[]>;
}

/**
 * Search Wikipedia for a topic
 */
async function searchWikipedia(query: string): Promise<WikipediaSearchResult[]> {
    const params = new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: query,
        srlimit: "3",
        format: "json",
        origin: "*",
    });

    try {
        const response = await fetch(`${WIKIPEDIA_API}?${params}`);
        if (!response.ok) return [];

        const data = await response.json();
        return data.query?.search || [];
    } catch (error) {
        logger.error("Wikipedia search failed", { error, query });
        return [];
    }
}

/**
 * Get Wikipedia page extract
 */
async function getWikipediaPage(title: string): Promise<WikipediaPage | null> {
    const params = new URLSearchParams({
        action: "query",
        titles: title,
        prop: "extracts|info",
        exintro: "true",
        explaintext: "true",
        inprop: "url",
        format: "json",
        origin: "*",
    });

    try {
        const response = await fetch(`${WIKIPEDIA_API}?${params}`);
        if (!response.ok) return null;

        const data = await response.json();
        const pages = data.query?.pages;
        if (!pages) return null;

        const page = Object.values(pages)[0] as any;
        if (page.missing) return null;

        return {
            title: page.title,
            extract: page.extract || "",
            fullurl: page.fullurl || "",
        };
    } catch (error) {
        logger.error("Wikipedia page fetch failed", { error, title });
        return null;
    }
}

/**
 * Search Wikidata for an entity
 */
async function searchWikidata(query: string, type?: "person" | "company"): Promise<string | null> {
    const params = new URLSearchParams({
        action: "wbsearchentities",
        search: query,
        language: "en",
        limit: "1",
        format: "json",
        origin: "*",
    });

    try {
        const response = await fetch(`${WIKIDATA_API}?${params}`);
        if (!response.ok) return null;

        const data = await response.json();
        return data.search?.[0]?.id || null;
    } catch (error) {
        logger.error("Wikidata search failed", { error, query });
        return null;
    }
}

/**
 * Get Wikidata entity details
 */
async function getWikidataEntity(entityId: string): Promise<WikidataEntity | null> {
    const params = new URLSearchParams({
        action: "wbgetentities",
        ids: entityId,
        languages: "en",
        format: "json",
        origin: "*",
    });

    try {
        const response = await fetch(`${WIKIDATA_API}?${params}`);
        if (!response.ok) return null;

        const data = await response.json();
        return data.entities?.[entityId] || null;
    } catch (error) {
        logger.error("Wikidata entity fetch failed", { error, entityId });
        return null;
    }
}

/**
 * Resolve a Wikidata entity ID to its label
 */
async function resolveEntityLabel(entityId: string): Promise<string | null> {
    if (!entityId.startsWith("Q")) return entityId;

    const params = new URLSearchParams({
        action: "wbgetentities",
        ids: entityId,
        props: "labels",
        languages: "en",
        format: "json",
        origin: "*",
    });

    try {
        const response = await fetch(`${WIKIDATA_API}?${params}`);
        if (!response.ok) return entityId;

        const data = await response.json();
        const entity = data.entities?.[entityId];
        return entity?.labels?.en?.value || entityId;
    } catch {
        return entityId;
    }
}

/**
 * Extract value from Wikidata claims
 */
function extractClaim(entity: WikidataEntity, propertyId: string): string | null {
    const claims = entity.claims[propertyId];
    if (!claims || claims.length === 0) return null;

    const value = claims[0]?.mainsnak?.datavalue?.value;
    if (!value) return null;

    // Handle different value types
    if (typeof value === "string") return value;
    if (value.text) return value.text;
    if (value.time) return value.time.replace(/^\+/, "").split("T")[0]; // Date
    if (value.amount) return value.amount;
    if (value.id) return value.id; // Entity reference - will be resolved later

    return null;
}

/**
 * Extract claim and resolve if it's an entity ID
 */
async function extractClaimWithResolve(entity: WikidataEntity, propertyId: string): Promise<string | null> {
    const value = extractClaim(entity, propertyId);
    if (!value) return null;

    // If it looks like a Wikidata entity ID, resolve it
    if (value.match(/^Q\d+$/)) {
        return await resolveEntityLabel(value);
    }

    return value;
}

/**
 * Wikidata property IDs
 */
const WIKIDATA_PROPS = {
    instanceOf: "P31",
    industry: "P452",
    foundedDate: "P571",
    headquarters: "P159",
    country: "P17",
    website: "P856",
    twitter: "P2002",
    linkedin: "P4264",
    github: "P2037",
    employees: "P1128",
    ceo: "P169",
    founder: "P112",
    occupation: "P106",
    employer: "P108",
    birthDate: "P569",
    birthPlace: "P19",
    education: "P69",
};

export class WikipediaProvider extends BaseProvider {
    name = "wikipedia";
    tier: ProviderTier = "free";
    costCents = 0;

    protected supportedFields: EnrichmentFieldKey[] = [
        "company",
        "companySummary",
        "industry",
        "foundedDate",
        "location",
        "shortBio",
        "title",
        "socialLinks",
    ];

    async enrich(input: NormalizedInput, field: EnrichmentFieldKey): Promise<ProviderResult | null> {
        const searchTerm = input.company || input.name;
        if (!searchTerm) return null;

        logger.info("📚 Wikipedia: Searching", { searchTerm, field });

        try {
            // Search Wikidata first (structured data)
            const entityId = await searchWikidata(searchTerm);

            if (entityId) {
                const entity = await getWikidataEntity(entityId);
                if (entity) {
                    const result = await this.extractFromWikidata(entity, field, input);
                    if (result) return result;
                }
            }

            // Fall back to Wikipedia for text-based extraction
            const searchResults = await searchWikipedia(searchTerm);
            if (searchResults.length === 0) return null;

            const firstResult = searchResults[0];
            if (!firstResult) return null;

            const page = await getWikipediaPage(firstResult.title);
            if (!page) return null;

            return this.extractFromWikipedia(page, field, input);

        } catch (error) {
            logger.error("Wikipedia enrichment failed", { error, searchTerm });
            return null;
        }
    }

    private async extractFromWikidata(
        entity: WikidataEntity,
        field: EnrichmentFieldKey,
        input: NormalizedInput
    ): Promise<ProviderResult | null> {
        let value: unknown = null;
        let confidence = 0.8;

        switch (field) {
            case "company":
                value = entity.labels.en?.value;
                break;
            case "companySummary":
                value = entity.descriptions.en?.value;
                confidence = 0.7;
                break;
            case "industry":
                // Resolve entity ID to human-readable label
                value = await extractClaimWithResolve(entity, WIKIDATA_PROPS.industry);
                break;
            case "foundedDate":
                value = extractClaim(entity, WIKIDATA_PROPS.foundedDate);
                break;
            case "location":
                // Resolve entity ID to human-readable label
                value = await extractClaimWithResolve(entity, WIKIDATA_PROPS.headquarters);
                break;
            case "shortBio":
                value = entity.descriptions.en?.value;
                confidence = 0.6;
                break;
            case "socialLinks": {
                const links: Record<string, string> = {};
                const twitter = extractClaim(entity, WIKIDATA_PROPS.twitter);
                const linkedin = extractClaim(entity, WIKIDATA_PROPS.linkedin);
                const github = extractClaim(entity, WIKIDATA_PROPS.github);
                const website = extractClaim(entity, WIKIDATA_PROPS.website);

                if (twitter) links.twitter = `https://twitter.com/${twitter}`;
                if (linkedin) links.linkedin = `https://linkedin.com/in/${linkedin}`;
                if (github) links.github = `https://github.com/${github}`;
                if (website) links.website = website;

                if (Object.keys(links).length > 0) {
                    value = links;
                }
                break;
            }
        }

        if (value === null || value === undefined) return null;

        return {
            field,
            value: typeof value === 'object' ? JSON.stringify(value) : value as string | string[],
            confidence,
            source: "wikipedia",
            raw: entity,
            timestamp: new Date().toISOString(),
            costCents: 0,
        };
    }

    private extractFromWikipedia(
        page: WikipediaPage,
        field: EnrichmentFieldKey,
        input: NormalizedInput
    ): ProviderResult | null {
        if (field === "shortBio" || field === "companySummary") {
            // Take first 500 chars of extract
            const summary = page.extract.slice(0, 500).trim();
            if (!summary) return null;

            return {
                field,
                value: summary,
                confidence: 0.6,
                source: "wikipedia",
                raw: { title: page.title, url: page.fullurl },
                timestamp: new Date().toISOString(),
                costCents: 0,
            };
        }

        return null;
    }
}

export const wikipediaProvider = new WikipediaProvider();
