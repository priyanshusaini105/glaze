/**
 * Simple Enrichment Runner
 * 
 * A simplified enrichment system for testing with free/cheap APIs.
 * Designed to work with test cases like:
 * - LinkedIn URL enrichment
 * - Name + Company enrichment
 * - Domain enrichment
 * 
 * Prioritizes free APIs: GitHub, Wikipedia, OpenCorporates, Serper
 */

import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../types/enrichment";

// Free providers
import { githubProvider } from "./providers/github-provider";
import { wikipediaProvider } from "./providers/wikipedia-provider";
import { openCorporatesProvider } from "./providers/opencorporates-provider";
import { companyScraperProvider } from "./providers/company-scraper";

// Cheap providers
import { serperProvider } from "./providers/serper-provider";
import { prospeoProvider } from "./providers/prospeo-provider";

// Premium providers (use sparingly)
import { linkedInProvider } from "./providers/linkedin-provider";

// Tools
import { resolveIdentity } from "./identity-resolver";
import { ConfidenceAggregator } from "./confidence-aggregator";
import { emailPatternInferenceProvider, generateEmailCandidates } from "./email-pattern-inference";

/**
 * Provider priority by cost
 */
const FREE_PROVIDERS = [
    githubProvider,
    wikipediaProvider,
    openCorporatesProvider,
    companyScraperProvider,
];

const CHEAP_PROVIDERS = [
    serperProvider,
    prospeoProvider,
    emailPatternInferenceProvider,
];

const PREMIUM_PROVIDERS = [
    linkedInProvider,
];

/**
 * Test case input format
 */
export interface TestInput {
    linkedinUrl?: string;
    name?: string;
    company?: string;
    domain?: string;
    email?: string;
}

/**
 * Enrichment result
 */
export interface EnrichmentResult {
    input: TestInput;
    results: Record<string, {
        value: unknown;
        confidence: number;
        source: string;
    }>;
    costs: {
        totalCents: number;
        breakdown: Record<string, number>;
    };
    timing: {
        durationMs: number;
    };
    errors: string[];
}

/**
 * Map expected fields to EnrichmentFieldKey
 */
function mapFieldName(field: string): EnrichmentFieldKey | null {
    const mapping: Record<string, EnrichmentFieldKey> = {
        "name": "name",
        "email": "email",
        "title": "title",
        "company": "company",
        "location": "location",
        "bio": "shortBio",
        "shortBio": "shortBio",
        "industry": "industry",
        "employeeCount": "companySize",
        "techStack": "techStack",
        "funding": "funding",
        "founded": "foundedDate",
        "foundedDate": "foundedDate",
        "description": "companySummary",
        "socialLinks": "socialLinks",
        "socialLinks.twitter": "socialLinks",
        "socialLinks.github": "socialLinks",
        "linkedinUrl": "linkedinUrl",
        "contactInfo.email": "email",
    };
    return mapping[field] || null;
}

/**
 * Normalize input to standard format
 */
function normalizeInput(input: TestInput, tableId = "test", rowId = "test"): NormalizedInput {
    // Clean domain if needed
    let domain = input.domain;
    if (domain) {
        // Handle markdown links like "[cal.com](http://cal.com/)"
        const mdMatch = domain.match(/\[([^\]]+)\]/);
        if (mdMatch?.[1]) {
            domain = mdMatch[1];
        }
        // Remove protocol and trailing slash
        domain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }

    return {
        rowId,
        tableId,
        name: input.name,
        company: input.company,
        domain,
        email: input.email,
        linkedinUrl: input.linkedinUrl,
        raw: input as unknown as Record<string, unknown>,
    };
}

/**
 * Run enrichment on a single input
 */
export async function runEnrichment(
    input: TestInput,
    expectedFields: string[],
    options: {
        usePremium?: boolean;
        maxCostCents?: number;
    } = {}
): Promise<EnrichmentResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const costBreakdown: Record<string, number> = {};
    let totalCost = 0;

    // Normalize input
    const normalizedInput = normalizeInput(input);
    
    // Map fields to EnrichmentFieldKey
    const fieldsToEnrich = [...new Set(
        expectedFields
            .map(f => mapFieldName(f))
            .filter((f): f is EnrichmentFieldKey => f !== null)
    )];

    logger.info("🚀 Simple Enrichment: Starting", {
        input,
        fieldsToEnrich,
        usePremium: options.usePremium,
    });

    // Resolve identity first
    const identity = await resolveIdentity(normalizedInput, fieldsToEnrich);
    
    // Update normalized input with resolved identity
    if (identity.canonicalName) normalizedInput.name = identity.canonicalName;
    if (identity.canonicalCompany) normalizedInput.company = identity.canonicalCompany;
    if (identity.domain) normalizedInput.domain = identity.domain;

    // Collect all results
    const allResults: ProviderResult[] = [];

    // Phase 1: Free providers
    for (const provider of FREE_PROVIDERS) {
        for (const field of fieldsToEnrich) {
            if (!provider.canEnrich(field)) continue;

            try {
                const result = await provider.enrich(normalizedInput, field);
                if (result) {
                    allResults.push(result);
                    const cost = result.costCents ?? 0;
                    costBreakdown[provider.name] = (costBreakdown[provider.name] || 0) + cost;
                    totalCost += cost;
                }
            } catch (error) {
                errors.push(`${provider.name}:${field} - ${error}`);
            }
        }
    }

    // Phase 2: Cheap providers (if needed)
    const fieldsCovered = new Set(allResults.map(r => r.field));
    const missingFields = fieldsToEnrich.filter(f => !fieldsCovered.has(f));

    if (missingFields.length > 0 && (options.maxCostCents === undefined || totalCost < options.maxCostCents)) {
        for (const provider of CHEAP_PROVIDERS) {
            for (const field of missingFields) {
                if (!provider.canEnrich(field)) continue;
                if (options.maxCostCents && totalCost + provider.costCents > options.maxCostCents) continue;

                try {
                    const result = await provider.enrich(normalizedInput, field);
                    if (result) {
                        allResults.push(result);
                        const cost = result.costCents ?? 0;
                        costBreakdown[provider.name] = (costBreakdown[provider.name] || 0) + cost;
                        totalCost += cost;
                    }
                } catch (error) {
                    errors.push(`${provider.name}:${field} - ${error}`);
                }
            }
        }
    }

    // Phase 3: Premium providers (if enabled and needed)
    if (options.usePremium) {
        const stillMissing = fieldsToEnrich.filter(f => 
            !allResults.some(r => r.field === f && r.confidence >= 0.7)
        );

        if (stillMissing.length > 0) {
            for (const provider of PREMIUM_PROVIDERS) {
                for (const field of stillMissing) {
                    if (!provider.canEnrich(field)) continue;
                    if (options.maxCostCents && totalCost + provider.costCents > options.maxCostCents) continue;

                    try {
                        const result = await provider.enrich(normalizedInput, field);
                        if (result) {
                            allResults.push(result);
                            const cost = result.costCents ?? 0;
                            costBreakdown[provider.name] = (costBreakdown[provider.name] || 0) + cost;
                            totalCost += cost;
                        }
                    } catch (error) {
                        errors.push(`${provider.name}:${field} - ${error}`);
                    }
                }
            }
        }
    }

    // Aggregate results
    const aggregator = new ConfidenceAggregator();
    aggregator.addAll(allResults);
    const aggregated = aggregator.aggregate();

    // Build final results
    const finalResults: Record<string, { value: unknown; confidence: number; source: string }> = {};

    for (const [field, agg] of aggregated) {
        if (agg.canonicalValue !== null) {
            finalResults[field] = {
                value: agg.canonicalValue,
                confidence: agg.confidence,
                source: agg.sources.join(", "),
            };
        }
    }

    const result: EnrichmentResult = {
        input,
        results: finalResults,
        costs: {
            totalCents: totalCost,
            breakdown: costBreakdown,
        },
        timing: {
            durationMs: Date.now() - startTime,
        },
        errors,
    };

    logger.info("✅ Simple Enrichment: Complete", {
        fieldsFound: Object.keys(finalResults).length,
        totalCost,
        durationMs: result.timing.durationMs,
    });

    return result;
}

/**
 * Run enrichment on multiple test cases
 */
export async function runTestCases(
    testCases: Array<{
        id: number;
        input: TestInput;
        expectedFields: string[];
        expectedBehavior?: string;
    }>,
    options: {
        usePremium?: boolean;
        maxCostCents?: number;
    } = {}
): Promise<{
    results: Array<{
        id: number;
        result: EnrichmentResult;
        success: boolean;
        matchedFields: string[];
        missingFields: string[];
    }>;
    summary: {
        total: number;
        successful: number;
        partial: number;
        failed: number;
        totalCostCents: number;
        avgDurationMs: number;
    };
}> {
    const results: Array<{
        id: number;
        result: EnrichmentResult;
        success: boolean;
        matchedFields: string[];
        missingFields: string[];
    }> = [];

    let totalCost = 0;
    let totalDuration = 0;
    let successful = 0;
    let partial = 0;
    let failed = 0;

    for (const testCase of testCases) {
        logger.info(`\n📋 Running test case ${testCase.id}`, { input: testCase.input });

        const result = await runEnrichment(testCase.input, testCase.expectedFields, options);

        // Check which fields were found
        const matchedFields = testCase.expectedFields.filter(f => {
            const mapped = mapFieldName(f);
            if (!mapped) return false;
            return result.results[mapped] !== undefined;
        });

        const missingFields = testCase.expectedFields.filter(f => !matchedFields.includes(f));

        const success = missingFields.length === 0;
        const isPartial = matchedFields.length > 0 && missingFields.length > 0;

        if (success) successful++;
        else if (isPartial) partial++;
        else failed++;

        totalCost += result.costs.totalCents;
        totalDuration += result.timing.durationMs;

        results.push({
            id: testCase.id,
            result,
            success,
            matchedFields,
            missingFields,
        });

        logger.info(`Test ${testCase.id}: ${success ? "✅ PASS" : isPartial ? "⚠️ PARTIAL" : "❌ FAIL"}`, {
            matched: matchedFields,
            missing: missingFields,
        });
    }

    return {
        results,
        summary: {
            total: testCases.length,
            successful,
            partial,
            failed,
            totalCostCents: totalCost,
            avgDurationMs: Math.round(totalDuration / testCases.length),
        },
    };
}
