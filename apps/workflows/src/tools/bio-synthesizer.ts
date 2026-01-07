/**
 * Bio Synthesizer Tool (LLM)
 * 
 * Phase 5 LLM synthesis tool.
 * Generates a 1-2 line bio from scraped snippets.
 * 
 * IMPORTANT: LLM never invents facts.
 * - Must have sources array
 * - Label as "generated"
 * - If sources < 2, downgrade confidence
 */

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../types/enrichment";

// Initialize Groq via OpenAI-compatible API
const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
});

/**
 * Source snippet for synthesis
 */
interface SourceSnippet {
    source: string;
    content: string;
    confidence: number;
}

/**
 * Extract relevant snippets from provider results
 */
function extractSnippets(
    results: ProviderResult[],
    fieldsToUse: EnrichmentFieldKey[]
): SourceSnippet[] {
    const snippets: SourceSnippet[] = [];
    
    for (const result of results) {
        if (fieldsToUse.includes(result.field) && result.value) {
            const content = typeof result.value === 'string' 
                ? result.value 
                : Array.isArray(result.value) 
                    ? result.value.join(', ')
                    : String(result.value);
            
            if (content.length > 0) {
                snippets.push({
                    source: result.source,
                    content,
                    confidence: result.confidence,
                });
            }
        }
    }
    
    return snippets;
}

/**
 * Generate a professional bio from snippets
 */
export async function synthesizeBio(
    input: NormalizedInput,
    results: ProviderResult[]
): Promise<ProviderResult | null> {
    logger.info("✨ BioSynthesizer: Starting synthesis", {
        rowId: input.rowId,
        resultsCount: results.length,
    });
    
    // Extract relevant snippets
    const snippets = extractSnippets(results, ['name', 'title', 'company', 'shortBio', 'location']);
    
    if (snippets.length === 0) {
        logger.debug("✨ BioSynthesizer: No snippets to synthesize from", { rowId: input.rowId });
        return null;
    }
    
    // Build context for LLM
    const contextParts: string[] = [];
    const sources: string[] = [];
    
    for (const snippet of snippets) {
        contextParts.push(`[${snippet.source}]: ${snippet.content}`);
        if (!sources.includes(snippet.source)) {
            sources.push(snippet.source);
        }
    }
    
    // Add name/company if available
    if (input.name) {
        contextParts.unshift(`Person's name: ${input.name}`);
    }
    if (input.company) {
        contextParts.unshift(`Company: ${input.company}`);
    }
    
    const systemPrompt = `You are a professional bio writer. Your job is to synthesize information into a concise, professional bio.

RULES:
1. Only use information from the provided sources - NEVER invent facts
2. Keep the bio to 1-2 sentences maximum
3. Use a professional, third-person tone
4. If information is conflicting, mention "according to [source]"
5. If there's not enough information, say so rather than making things up
6. Focus on: name, current role, company, key achievements`;

    const userPrompt = `Based on these sources, write a brief professional bio:

${contextParts.join('\n')}

Write a 1-2 sentence bio. Only include facts from the sources above.`;

    try {
        const result = await generateText({
            model: groq("llama-3.3-70b-versatile"),
            system: systemPrompt,
            prompt: userPrompt,
            temperature: 0.3,
            maxTokens: 150,
        });
        
        const bio = result.text.trim();
        
        if (!bio || bio.length < 10) {
            logger.debug("✨ BioSynthesizer: Generated bio too short", { rowId: input.rowId, bio });
            return null;
        }
        
        // Calculate confidence based on number of sources
        let confidence = 0.4; // Base confidence for LLM output
        if (sources.length >= 2) {
            confidence = 0.6;
        }
        if (sources.length >= 3) {
            confidence = 0.7;
        }
        
        // Add average source confidence
        const avgSourceConfidence = snippets.reduce((sum, s) => sum + s.confidence, 0) / snippets.length;
        confidence = (confidence + avgSourceConfidence) / 2;
        
        logger.info("✅ BioSynthesizer: Bio generated", {
            rowId: input.rowId,
            bioLength: bio.length,
            sources: sources.length,
            confidence,
        });
        
        return {
            field: 'shortBio',
            value: bio,
            confidence,
            source: 'llm_synthesizer',
            timestamp: new Date().toISOString(),
            raw: {
                sources,
                snippetsUsed: snippets.length,
                model: 'llama-3.3-70b-versatile',
                label: 'generated',
            },
        };
    } catch (error) {
        logger.error("❌ BioSynthesizer: LLM error", {
            error: error instanceof Error ? error.message : "Unknown error",
            rowId: input.rowId,
        });
        return null;
    }
}

/**
 * Bio Synthesizer Provider class
 */
export class BioSynthesizerProvider {
    name = "llm_synthesizer";
    tier = "cheap" as const;
    costCents = 0.5; // Groq is very cheap
    
    canEnrich(field: EnrichmentFieldKey): boolean {
        return field === 'shortBio';
    }
    
    async enrich(
        input: NormalizedInput,
        _field: EnrichmentFieldKey,
        existingResults: ProviderResult[]
    ): Promise<ProviderResult | null> {
        return synthesizeBio(input, existingResults);
    }
}

// Export singleton
export const bioSynthesizerProvider = new BioSynthesizerProvider();
