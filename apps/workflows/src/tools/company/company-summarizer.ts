/**
 * Company Summarizer Tool (LLM)
 * 
 * Phase 5 LLM synthesis tool.
 * Generates a company summary from scraped data.
 * 
 * IMPORTANT: LLM never invents facts.
 * - Must have sources array
 * - Label as "generated"
 * - If sources < 2, downgrade confidence
 * - If sources conflict, LLM must say "varies by source"
 */

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../../types/enrichment";

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Source data for company synthesis
 */
interface CompanySourceData {
    source: string;
    name?: string;
    description?: string;
    size?: string;
    location?: string;
    industry?: string;
    founded?: string | number;
    confidence: number;
}

/**
 * Extract company data from provider results
 */
function extractCompanyData(results: ProviderResult[]): CompanySourceData[] {
    const sourceDataMap = new Map<string, CompanySourceData>();

    for (const result of results) {
        const source = result.source;

        if (!sourceDataMap.has(source)) {
            sourceDataMap.set(source, {
                source,
                confidence: result.confidence,
            });
        }

        const data = sourceDataMap.get(source)!;

        // Update confidence to max
        data.confidence = Math.max(data.confidence, result.confidence);

        // Map fields
        switch (result.field) {
            case 'company':
                data.name = String(result.value);
                break;
            case 'companySummary':
                data.description = String(result.value);
                break;
            case 'companySize':
                data.size = String(result.value);
                break;
            case 'location':
                data.location = String(result.value);
                break;
            case 'foundedDate':
                data.founded = result.value as string | number;
                break;
        }
    }

    return Array.from(sourceDataMap.values()).filter(d =>
        d.name || d.description || d.size || d.location || d.founded
    );
}

/**
 * Check for conflicts between sources
 */
function findConflicts(sources: CompanySourceData[]): string[] {
    const conflicts: string[] = [];

    // Check company name conflicts
    const names = sources.map(s => s.name).filter(Boolean);
    const uniqueNames = new Set(names.map(n => n?.toLowerCase().trim()));
    if (uniqueNames.size > 1) {
        conflicts.push(`Company name varies: ${[...uniqueNames].join(' vs ')}`);
    }

    // Check size conflicts
    const sizes = sources.map(s => s.size).filter(Boolean);
    const uniqueSizes = new Set(sizes);
    if (uniqueSizes.size > 1) {
        conflicts.push(`Company size varies: ${[...uniqueSizes].join(' vs ')}`);
    }

    return conflicts;
}

/**
 * Generate a company summary from source data
 */
export async function synthesizeCompanySummary(
    input: NormalizedInput,
    results: ProviderResult[]
): Promise<ProviderResult | null> {
    logger.info("🏢 CompanySummarizer: Starting synthesis", {
        rowId: input.rowId,
        resultsCount: results.length,
    });

    // Extract company data from results
    const sourcesData = extractCompanyData(results);

    if (sourcesData.length === 0) {
        logger.debug("🏢 CompanySummarizer: No company data to synthesize", { rowId: input.rowId });
        return null;
    }

    // Check for conflicts
    const conflicts = findConflicts(sourcesData);

    // Build context for LLM
    const contextParts: string[] = [];
    const sources: string[] = [];

    for (const data of sourcesData) {
        const parts: string[] = [];
        if (data.name) parts.push(`Name: ${data.name}`);
        if (data.description) parts.push(`Description: ${data.description}`);
        if (data.size) parts.push(`Size: ${data.size}`);
        if (data.location) parts.push(`Location: ${data.location}`);
        if (data.founded) parts.push(`Founded: ${data.founded}`);

        if (parts.length > 0) {
            contextParts.push(`[${data.source}]:\n${parts.join('\n')}`);
            sources.push(data.source);
        }
    }

    // Add domain if available
    if (input.domain) {
        contextParts.unshift(`Domain: ${input.domain}`);
    }

    // Add conflict notes
    let conflictNote = '';
    if (conflicts.length > 0) {
        conflictNote = `\n\nNOTE: There are conflicting data points between sources:\n${conflicts.join('\n')}`;
    }

    const systemPrompt = `You are a professional company researcher. Your job is to synthesize company information into a concise, accurate summary.

RULES:
1. Only use information from the provided sources - NEVER invent facts
2. Keep the summary to 2-3 sentences maximum
3. Use a professional, informative tone
4. If information conflicts between sources, acknowledge this (e.g., "Company size varies between sources")
5. If there's limited information, say so rather than making assumptions
6. Focus on: what the company does, size/scale, location, notable characteristics`;

    const userPrompt = `Based on these sources, write a brief company summary:

${contextParts.join('\n\n')}${conflictNote}

Write a 2-3 sentence company summary. Only include facts from the sources above.`;

    try {
        const result = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3,
            maxTokens: 200,
        });

        const summary = result.text.trim();

        if (!summary || summary.length < 20) {
            logger.debug("🏢 CompanySummarizer: Generated summary too short", { rowId: input.rowId, summary });
            return null;
        }

        // Calculate confidence based on sources and conflicts
        let confidence = 0.4; // Base confidence for LLM output

        if (sources.length >= 2) {
            confidence = 0.6;
        }
        if (sources.length >= 3) {
            confidence = 0.7;
        }

        // Penalize for conflicts
        if (conflicts.length > 0) {
            confidence -= 0.1 * conflicts.length;
        }

        // Add average source confidence
        const avgSourceConfidence = sourcesData.reduce((sum, s) => sum + s.confidence, 0) / sourcesData.length;
        confidence = (confidence + avgSourceConfidence) / 2;

        // Ensure within bounds
        confidence = Math.max(0.2, Math.min(0.8, confidence));

        logger.info("✅ CompanySummarizer: Summary generated", {
            rowId: input.rowId,
            summaryLength: summary.length,
            sources: sources.length,
            conflicts: conflicts.length,
            confidence,
        });

        return {
            field: 'companySummary',
            value: summary,
            confidence,
            source: 'llm_synthesizer',
            timestamp: new Date().toISOString(),
            raw: {
                sources,
                conflicts,
                model: 'llama-3.3-70b-versatile',
                label: 'generated',
            },
        };
    } catch (error) {
        logger.error("❌ CompanySummarizer: LLM error", {
            error: error instanceof Error ? error.message : "Unknown error",
            rowId: input.rowId,
        });
        return null;
    }
}

/**
 * Company Summarizer Provider class
 */
export class CompanySummarizerProvider {
    name = "llm_summarizer";
    tier = "cheap" as const;
    costCents = 0.5; // Groq is very cheap

    canEnrich(field: EnrichmentFieldKey): boolean {
        return field === 'companySummary';
    }

    async enrich(
        input: NormalizedInput,
        _field: EnrichmentFieldKey,
        existingResults: ProviderResult[]
    ): Promise<ProviderResult | null> {
        return synthesizeCompanySummary(input, existingResults);
    }
}

// Export singleton
export const companySummarizerProvider = new CompanySummarizerProvider();
