/**
 * Smart Enrichment Provider
 * 
 * Orchestrates the 3-layer enrichment workflow:
 * 1. Candidate Collection (Serper queries → multiple candidates)
 * 2. Verification (score each candidate)
 * 3. Decision (accept/reject with honest confidence)
 * 
 * This provider can enrich:
 * - domain (company website domain)
 * - website (full URL to company website)
 * - industry (via company research)
 * - companySummary (via homepage scraping)
 */

import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult, ProviderTier } from "../../types/enrichment";
import { BaseProvider } from "../interfaces";
import { collectCandidates } from "./candidate-collector";
import { verifyCandidates } from "./domain-verifier";
import { makeDecision, type EnrichmentDecision } from "./candidate-scorer";
import { normalizeUrl } from "./url-normalizer";

// We'll also use Serper for general enrichment (industry, etc.)
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_API_URL = "https://google.serper.dev/search";

/**
 * Query Serper for company information
 */
async function querySerperForInfo(
    query: string
): Promise<{
    organic: Array<{ title: string; snippet: string; link: string }>;
    knowledgeGraph?: { title?: string; type?: string; description?: string; attributes?: Record<string, string> };
}> {
    if (!SERPER_API_KEY) {
        return { organic: [] };
    }

    try {
        const response = await fetch(SERPER_API_URL, {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ q: query, num: 5 }),
        });

        if (!response.ok) return { organic: [] };
        return await response.json();
    } catch {
        return { organic: [] };
    }
}

/**
 * Extract industry from search results
 */
function extractIndustry(
    results: Array<{ title: string; snippet: string }>,
    knowledgeGraph?: { type?: string; description?: string; attributes?: Record<string, string> }
): { value: string | null; confidence: number; source: string } {
    // Try knowledge graph first
    if (knowledgeGraph?.type) {
        return {
            value: knowledgeGraph.type,
            confidence: 0.85,
            source: "knowledge_graph",
        };
    }

    if (knowledgeGraph?.attributes?.["Industry"]) {
        return {
            value: knowledgeGraph.attributes["Industry"],
            confidence: 0.85,
            source: "knowledge_graph",
        };
    }

    // Industry keywords to look for in snippets
    const industryKeywords = [
        { pattern: /software\s*(company|platform|solutions?)/i, industry: "Software" },
        { pattern: /saas\s*(company|platform|provider)/i, industry: "SaaS" },
        { pattern: /cloud\s*(computing|platform|services?)/i, industry: "Cloud Computing" },
        { pattern: /fintech|financial\s*technology/i, industry: "FinTech" },
        { pattern: /e-?commerce|online\s*(retail|store)/i, industry: "E-commerce" },
        { pattern: /ai|artificial\s*intelligence|machine\s*learning/i, industry: "AI/ML" },
        { pattern: /cybersecurity|security\s*software/i, industry: "Cybersecurity" },
        { pattern: /healthcare|health\s*tech|medical/i, industry: "Healthcare" },
        { pattern: /edtech|education\s*technology/i, industry: "EdTech" },
        { pattern: /venture\s*capital|vc\s*firm|investment\s*firm/i, industry: "Venture Capital" },
        { pattern: /advertising|ad\s*tech|marketing\s*platform/i, industry: "AdTech" },
        { pattern: /social\s*media|social\s*network/i, industry: "Social Media" },
        { pattern: /video\s*streaming|streaming\s*platform/i, industry: "Streaming" },
        { pattern: /gaming|game\s*(developer|studio)/i, industry: "Gaming" },
        { pattern: /logistics|supply\s*chain/i, industry: "Logistics" },
        { pattern: /real\s*estate|property\s*(tech|platform)/i, industry: "Real Estate" },
        { pattern: /consumer\s*electronics/i, industry: "Consumer Electronics" },
        { pattern: /semiconductor|chip\s*(maker|manufacturer)/i, industry: "Semiconductors" },
    ];

    // Scan all snippets
    const combinedText = results.map(r => `${r.title} ${r.snippet}`).join(" ");

    for (const { pattern, industry } of industryKeywords) {
        if (pattern.test(combinedText)) {
            return {
                value: industry,
                confidence: 0.7,
                source: "snippet_extraction",
            };
        }
    }

    return { value: null, confidence: 0, source: "none" };
}

/**
 * Smart Enrichment Provider
 */
export class SmartEnrichmentProvider extends BaseProvider {
    name = "smart_enrichment";
    tier: ProviderTier = "cheap";
    costCents = 2; // ~2 Serper queries

    protected supportedFields: EnrichmentFieldKey[] = [
        "domain",
        "website",
        "industry",
        "companySummary",
        "company",
    ];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        const companyName = input.company || input.name;

        if (!companyName) {
            logger.warn("SmartEnrichment: No company name provided", { rowId: input.rowId });
            return null;
        }

        logger.info("🧠 SmartEnrichment: Starting enrichment", {
            rowId: input.rowId,
            field,
            companyName,
            hasDomain: !!input.domain,
        });

        switch (field) {
            case "domain":
                return this.enrichDomain(input, companyName);
            case "website":
                return this.enrichWebsite(input, companyName);
            case "industry":
                return this.enrichIndustry(input, companyName);
            case "companySummary":
                return this.enrichCompanySummary(input, companyName);
            case "company":
                return this.enrichCompanyName(input, companyName);
            default:
                return null;
        }
    }

    /**
     * Enrich domain - SIMPLIFIED: 1 Serper query, pick first result
     */
    private async enrichDomain(
        input: NormalizedInput,
        companyName: string
    ): Promise<ProviderResult | null> {
        const industry = (input.raw as Record<string, string>)?.industry;

        // Single query, pick first valid domain
        const result = await this.findFirstValidDomain(companyName, industry);

        if (!result) {
            return null;
        }

        return {
            field: "domain",
            value: result.domain,
            confidence: 0.8, // High confidence for first result
            source: this.name,
            timestamp: new Date().toISOString(),
            costCents: 1, // Single query
            raw: {
                query: result.query,
                position: result.position,
            },
        };
    }

    /**
     * Enrich website - SIMPLIFIED: 1 Serper query, pick first result
     */
    private async enrichWebsite(
        input: NormalizedInput,
        companyName: string
    ): Promise<ProviderResult | null> {
        if (!companyName || companyName.trim().length < 2) {
            logger.warn("❌ SmartEnrichment: Cannot enrich website - missing/invalid company name", {
                rowId: input.rowId,
                companyName: companyName || '<empty>',
                companyLength: companyName?.length || 0,
                availableFields: Object.keys(input.raw || {}),
                hasName: !!input.name,
                hasCompany: !!input.company
            });
            return null;
        }

        const industry = (input.raw as Record<string, string>)?.industry;

        logger.info("🌐 SmartEnrichment: Starting website enrichment", {
            rowId: input.rowId,
            companyName,
            hasIndustry: !!industry,
            industry: industry || '<none>',
            inputFields: Object.keys(input.raw || {})
        });

        // Single query, pick first valid domain
        const result = await this.findFirstValidDomain(companyName, industry);

        if (!result) {
            logger.warn("❌ SmartEnrichment: Website enrichment failed", {
                rowId: input.rowId,
                companyName,
                industry: industry || '<none>',
                reason: "No valid domain found in search results"
            });
            return null;
        }

        const normalizedUrl = normalizeUrl(result.url);

        logger.info("✅ SmartEnrichment: Website enrichment succeeded", {
            rowId: input.rowId,
            companyName,
            url: normalizedUrl,
            originalUrl: result.url,
            domain: result.domain,
            confidence: 0.8
        });

        return {
            field: "website",
            value: normalizedUrl,
            confidence: 0.8,
            source: this.name,
            timestamp: new Date().toISOString(),
            costCents: 1,
            raw: {
                query: result.query,
                position: result.position,
                originalUrl: result.url,
            },
        };
    }

    /**
     * Simple helper: 1 Serper query, return first valid domain
     */
    private async findFirstValidDomain(
        companyName: string,
        industry?: string
    ): Promise<{ domain: string; url: string; query: string; position: number } | null> {
        // Single query: company name + "official website - landing page"
        const query = `${companyName} official website - landing page`;

        logger.info("🔍 SmartEnrichment: Searching", { query });

        const results = await querySerperForInfo(query);

        if (!results.organic || results.organic.length === 0) {
            logger.warn("⚠️ SmartEnrichment: No search results from Serper", {
                query,
                companyName,
                hasIndustry: !!industry
            });
            return null;
        }

        logger.info("📊 SmartEnrichment: Search results received", {
            query,
            totalResults: results.organic.length,
            results: results.organic.map(r => ({ title: r.title, link: r.link }))
        });

        // Excluded domains (social, directories, etc.)
        const excluded = [
            'linkedin.com', 'facebook.com', 'twitter.com', 'x.com',
            'instagram.com', 'youtube.com', 'wikipedia.org', 'crunchbase.com',
            'zoominfo.com', 'bloomberg.com', 'forbes.com', 'yelp.com',
            'glassdoor.com', 'indeed.com', 'g2.com', 'capterra.com',
        ];

        const skippedDomains: string[] = [];
        let validFound = false;

        // Find first valid result
        for (const result of results.organic) {
            try {
                const url = new URL(result.link);
                const domain = url.hostname.replace(/^www\./, '').toLowerCase();

                // Skip excluded domains
                if (excluded.some(ex => domain === ex || domain.endsWith('.' + ex))) {
                    skippedDomains.push(domain);
                    logger.debug("⏭️ SmartEnrichment: Skipping excluded domain", {
                        domain,
                        title: result.title
                    });
                    continue;
                }

                validFound = true;
                logger.info("✅ SmartEnrichment: Valid domain found", {
                    domain,
                    url: result.link,
                    title: result.title,
                    skippedCount: skippedDomains.length
                });

                return {
                    domain,
                    url: result.link,
                    query,
                    position: 1,
                };
            } catch (error) {
                logger.warn("⚠️ SmartEnrichment: Invalid URL in search result", {
                    link: result.link,
                    error: error instanceof Error ? error.message : String(error)
                });
                continue;
            }
        }

        if (!validFound) {
            logger.warn("❌ SmartEnrichment: All results excluded or invalid", {
                query,
                totalResults: results.organic.length,
                skippedDomains,
                reason: skippedDomains.length > 0 
                    ? "All results were social media/directory sites"
                    : "All results had invalid URLs"
            });
        }

        return null;
    }


    /**
     * Enrich industry using Serper + knowledge graph
     */
    private async enrichIndustry(
        input: NormalizedInput,
        companyName: string
    ): Promise<ProviderResult | null> {
        const query = `"${companyName}" company industry`;
        const results = await querySerperForInfo(query);

        const { value, confidence, source } = extractIndustry(
            results.organic,
            results.knowledgeGraph
        );

        if (!value) {
            return null;
        }

        return {
            field: "industry",
            value,
            confidence,
            source: this.name,
            timestamp: new Date().toISOString(),
            costCents: 1,
            raw: { extractionSource: source, query },
        };
    }

    /**
     * Enrich company summary from knowledge graph or snippets
     */
    private async enrichCompanySummary(
        input: NormalizedInput,
        companyName: string
    ): Promise<ProviderResult | null> {
        const query = `"${companyName}" company about`;
        const results = await querySerperForInfo(query);

        // Try knowledge graph description first
        if (results.knowledgeGraph?.description) {
            return {
                field: "companySummary",
                value: results.knowledgeGraph.description,
                confidence: 0.8,
                source: this.name,
                timestamp: new Date().toISOString(),
                costCents: 1,
                raw: { extractionSource: "knowledge_graph" },
            };
        }

        // Fall back to best snippet
        if (results.organic.length > 0) {
            const bestSnippet = results.organic[0]?.snippet;
            if (bestSnippet && bestSnippet.length > 50) {
                return {
                    field: "companySummary",
                    value: bestSnippet.slice(0, 300),
                    confidence: 0.6,
                    source: this.name,
                    timestamp: new Date().toISOString(),
                    costCents: 1,
                    raw: { extractionSource: "snippet" },
                };
            }
        }

        return null;
    }

    /**
     * Verify/enrich company name
     */
    private async enrichCompanyName(
        input: NormalizedInput,
        companyName: string
    ): Promise<ProviderResult | null> {
        // If we already have a company name, verify it
        const query = `"${companyName}" official company`;
        const results = await querySerperForInfo(query);

        if (results.knowledgeGraph?.title) {
            return {
                field: "company",
                value: results.knowledgeGraph.title,
                confidence: 0.85,
                source: this.name,
                timestamp: new Date().toISOString(),
                costCents: 1,
                raw: { verified: true, source: "knowledge_graph" },
            };
        }

        // Return existing name with lower confidence if no verification
        return {
            field: "company",
            value: companyName,
            confidence: 0.5,
            source: this.name,
            timestamp: new Date().toISOString(),
            costCents: 1,
            raw: { verified: false },
        };
    }
}

export const smartEnrichmentProvider = new SmartEnrichmentProvider();
