/**
 * Email Pattern Inference Tool
 * 
 * Phase 3 email pipeline tool.
 * Generates email candidates based on name patterns and domain.
 * 
 * Pattern examples:
 * - first@domain.com
 * - first.last@domain.com
 * - flast@domain.com
 * - firstl@domain.com
 * - last.first@domain.com
 * 
 * Confidence: 0.3 (unverified)
 */

import { logger } from "@trigger.dev/sdk";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../../types/enrichment";
import { normalizeDomain, isFreeEmailDomain } from "../domain-normalizer";
import type { EmailCandidate } from "@glaze/types/field-value";

/**
 * Common email patterns by priority (most common first)
 */
const EMAIL_PATTERNS: Array<{
    pattern: string;
    generate: (first: string, last: string) => string;
    frequency: number; // 0-1, how common this pattern is
}> = [
    { pattern: "first.last", generate: (f, l) => `${f}.${l}`, frequency: 0.35 },
    { pattern: "first", generate: (f, _l) => f, frequency: 0.20 },
    { pattern: "flast", generate: (f, l) => `${f[0]}${l}`, frequency: 0.15 },
    { pattern: "firstl", generate: (f, l) => `${f}${l[0]}`, frequency: 0.10 },
    { pattern: "first_last", generate: (f, l) => `${f}_${l}`, frequency: 0.05 },
    { pattern: "last.first", generate: (f, l) => `${l}.${f}`, frequency: 0.05 },
    { pattern: "last", generate: (_f, l) => l, frequency: 0.03 },
    { pattern: "firstlast", generate: (f, l) => `${f}${l}`, frequency: 0.03 },
    { pattern: "f.last", generate: (f, l) => `${f[0]}.${l}`, frequency: 0.02 },
    { pattern: "first.l", generate: (f, l) => `${f}.${l[0]}`, frequency: 0.02 },
];

/**
 * Normalize a name part for email generation
 */
function normalizeNamePart(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove accents
        .replace(/[^a-z]/g, ""); // Remove non-letters
}

/**
 * Parse a full name into first and last name
 */
function parseFullName(fullName: string): { first: string; last: string } | null {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    
    if (parts.length === 0) {
        return null;
    }
    
    if (parts.length === 1) {
        return { first: normalizeNamePart(parts[0]!), last: "" };
    }
    
    // First name is first part, last name is last part
    const first = normalizeNamePart(parts[0]!);
    const last = normalizeNamePart(parts[parts.length - 1]!);
    
    if (!first || first.length < 2) {
        return null;
    }
    
    return { first, last };
}

/**
 * Generate email candidates for a name and domain
 */
export function generateEmailCandidates(
    name: string,
    domain: string,
    options: {
        maxCandidates?: number;
        includeRarePatterns?: boolean;
    } = {}
): EmailCandidate[] {
    const { maxCandidates = 5, includeRarePatterns = false } = options;
    
    const parsedName = parseFullName(name);
    if (!parsedName) {
        return [];
    }
    
    const normalizedDomain = normalizeDomain(domain);
    if (!normalizedDomain || isFreeEmailDomain(normalizedDomain)) {
        return [];
    }
    
    const { first, last } = parsedName;
    const candidates: EmailCandidate[] = [];
    
    // Filter patterns based on name components
    const applicablePatterns = EMAIL_PATTERNS.filter(p => {
        // Skip patterns that need last name if we don't have one
        if (!last && p.pattern.includes("last")) return false;
        // Skip rare patterns if not requested
        if (!includeRarePatterns && p.frequency < 0.03) return false;
        return true;
    });
    
    // Generate candidates
    for (const pattern of applicablePatterns) {
        if (candidates.length >= maxCandidates) break;
        
        try {
            const localPart = pattern.generate(first, last || first);
            if (localPart && localPart.length >= 2) {
                const email = `${localPart}@${normalizedDomain}`;
                
                // Calculate confidence based on pattern frequency
                const confidence = Math.min(0.35, pattern.frequency * 0.8);
                
                candidates.push({
                    email,
                    confidence,
                    verified: false,
                    pattern: pattern.pattern,
                    sources: ["email_pattern"],
                });
            }
        } catch {
            // Skip invalid patterns
        }
    }
    
    return candidates;
}

/**
 * Email Pattern Inference Provider
 */
export class EmailPatternInferenceProvider {
    name = "email_pattern";
    tier = "free" as const;
    costCents = 0;

    canEnrich(field: EnrichmentFieldKey): boolean {
        return field === "emailCandidates";
    }

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        if (field !== "emailCandidates") {
            return null;
        }

        // Need both name and domain
        if (!input.name || !input.domain) {
            logger.debug("📧 EmailPatternProvider: Missing name or domain", {
                rowId: input.rowId,
                hasName: !!input.name,
                hasDomain: !!input.domain,
            });
            return null;
        }

        logger.info("📧 EmailPatternProvider: Generating candidates", {
            rowId: input.rowId,
            name: input.name,
            domain: input.domain,
        });

        const candidates = generateEmailCandidates(input.name, input.domain, {
            maxCandidates: 5,
            includeRarePatterns: false,
        });

        if (candidates.length === 0) {
            return null;
        }

        // Return as array of email strings with metadata
        const emailStrings = candidates.map(c => c.email);
        const avgConfidence = candidates.reduce((sum, c) => sum + c.confidence, 0) / candidates.length;

        logger.info("✅ EmailPatternProvider: Generated candidates", {
            rowId: input.rowId,
            count: candidates.length,
            avgConfidence: avgConfidence.toFixed(2),
        });

        return {
            field: "emailCandidates",
            value: emailStrings,
            confidence: avgConfidence,
            source: this.name,
            costCents: this.costCents,
            timestamp: new Date().toISOString(),
            verified: false,
            raw: { candidates },
        };
    }
}

// Export singleton instance
export const emailPatternInferenceProvider = new EmailPatternInferenceProvider();

/**
 * Utility: Get the most likely email pattern for a company
 * (Can be enhanced with historical data)
 */
export function getMostLikelyPattern(domain: string): string {
    // Default to first.last as it's most common
    return "first.last";
}

/**
 * Utility: Validate email format
 */
export function isValidEmailFormat(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}
