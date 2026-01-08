/**
 * Company Identity Tool (Name)
 * 
 * DNS-like resolution for company names.
 * 
 * What this tool does:
 * - Answers ONE question: "Given this company name string, what real-world company entity does it most likely refer to?"
 * - Returns: canonicalCompanyName, websiteUrl, domain, confidence
 * 
 * What this tool does NOT do:
 * - No enrichment
 * - No tech stack
 * - No funding
 * - No employees
 * - No guessing
 * 
 * Process:
 * 1. Normalize input name
 * 2. Generate search queries (deterministic)
 * 3. Candidate extraction (fan-out, not single result)
 * 4. Candidate validation (kill junk)
 * 5. Disambiguation logic
 * 6. Confidence scoring (conservative)
 * 7. Output decision
 */

import { logger } from "@trigger.dev/sdk";

/**
 * Confidence scoring thresholds
 */
const CONFIDENCE_THRESHOLDS = {
    HIGH: 0.85,      // Safe to enrich fully
    MEDIUM: 0.65,    // Public data only
    LOW: 0.40,       // Return cautiously
    FAIL: 0.40,      // Do not enrich
} as const;

/**
 * Signal weights for confidence calculation
 * 
 * V1 conservative weights:
 * - External corroboration reduced from 0.20 to 0.10 (snippet mentions are not real corroboration)
 * - Weight redistributed to official match and search intent
 */
const SIGNAL_WEIGHTS = {
    OFFICIAL_WEBSITE_MATCH: 0.40,    // <title>, H1, footer contains company name
    SEARCH_INTENT_ALIGNMENT: 0.25,   // Found via "official" style query
    DOMAIN_QUALITY: 0.15,            // HTTPS, high search position
    EXTERNAL_CORROBORATION: 0.10,    // Mentions in snippet (weak signal)
    NAME_UNIQUENESS: 0.10,           // Rare company name
} as const;

/**
 * Penalties for confidence calculation
 */
const PENALTIES = {
    MULTIPLE_STRONG_CANDIDATES: 0.20,  // ≥2 candidates within 10% of each other
    GENERIC_NAME: 0.15,                // Name appears in many unrelated industries
    WEAK_HOMEPAGE_SIGNALS: 0.10,       // Thin content, placeholder copy
} as const;

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_API_URL = "https://google.serper.dev/search";

/**
 * Result of company name resolution
 */
export interface CompanyNameResolutionResult {
    canonicalCompanyName: string | null;
    websiteUrl: string | null;
    domain: string | null;
    confidence: number; // 0.0 - 1.0
    confidenceLevel: "HIGH" | "MEDIUM" | "LOW" | "FAIL";
    reason?: string; // Explanation for low confidence
}

/**
 * Serper search result
 */
interface SerperOrganic {
    title: string;
    link: string;
    snippet: string;
    position: number;
}

interface SerperResponse {
    organic?: SerperOrganic[];
    knowledgeGraph?: {
        title?: string;
        description?: string;
        website?: string;
    };
}

/**
 * Candidate company
 */
interface CompanyCandidate {
    domain: string;
    websiteUrl: string;
    title: string;
    snippet: string;
    searchPosition: number;
    querySource: string; // Which query found this

    // Verification signals
    signals: {
        officialWebsiteMatch: number;
        searchIntentAlignment: number;
        domainQuality: number;
        externalCorroboration: number;
        nameUniqueness: number;
    };

    penalties: {
        multipleStrongCandidates: number;
        genericName: number;
        weakHomepageSignals: number;
    };

    confidence: number;
}

/**
 * Step 1: Normalize company name
 * 
 * Remove legal suffixes, lowercase, trim
 */
function normalizeCompanyName(name: string): string {
    return name
        .toLowerCase()
        .replace(/\s+inc\.?$/i, "")
        .replace(/\s+llc\.?$/i, "")
        .replace(/\s+ltd\.?$/i, "")
        .replace(/\s+corp\.?$/i, "")
        .replace(/\s+corporation$/i, "")
        .replace(/\s+company$/i, "")
        .replace(/\s+co\.?$/i, "")
        .replace(/\s+pvt\.?\s+ltd\.?$/i, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
}

/**
 * Step 2: Generate search queries
 * 
 * Single query: company name + "official website - landing page"
 * This is the most specific and effective query for finding company websites
 */
function generateSearchQueries(companyName: string): string[] {
    return [
        `${companyName} official website - landing page`,
    ];
}

/**
 * Step 3: Perform Serper search
 */
async function performSerperSearch(query: string): Promise<SerperResponse | null> {
    if (!SERPER_API_KEY) {
        logger.warn("⚠️ CompanyNameResolver: No SERPER_API_KEY configured");
        return null;
    }

    try {
        const response = await fetch(SERPER_API_URL, {
            method: "POST",
            headers: {
                "X-API-KEY": SERPER_API_KEY,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                q: query,
                num: 10,
            }),
        });

        if (!response.ok) {
            logger.error("❌ CompanyNameResolver: Serper API error", {
                status: response.status,
                statusText: response.statusText,
            });
            return null;
        }

        return await response.json() as SerperResponse;
    } catch (error) {
        logger.error("❌ CompanyNameResolver: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Check if domain should be excluded (directories, social, etc.)
 */
const EXCLUDED_DOMAINS = [
    "linkedin.com", "facebook.com", "twitter.com", "x.com",
    "instagram.com", "youtube.com", "crunchbase.com",
    "bloomberg.com", "forbes.com", "wikipedia.org",
    "yelp.com", "glassdoor.com", "indeed.com",
    "apollo.io", "zoominfo.com", "g2.com", "capterra.com",
];

function isExcludedDomain(domain: string): boolean {
    return EXCLUDED_DOMAINS.some(excluded =>
        domain === excluded || domain.endsWith("." + excluded)
    );
}

/**
 * Step 4: Extract candidates from search results
 */
function extractCandidates(
    responses: Array<{ query: string; response: SerperResponse }>,
    normalizedName: string
): CompanyCandidate[] {
    const candidateMap = new Map<string, CompanyCandidate>();

    for (const { query, response } of responses) {
        if (!response.organic) continue;

        for (const result of response.organic) {
            const domain = extractDomain(result.link);
            if (!domain || isExcludedDomain(domain)) continue;

            // Only keep first occurrence of each domain
            if (!candidateMap.has(domain)) {
                candidateMap.set(domain, {
                    domain,
                    websiteUrl: result.link.startsWith("http") ? result.link : `https://${result.link}`,
                    title: result.title,
                    snippet: result.snippet,
                    searchPosition: result.position,
                    querySource: query,
                    signals: {
                        officialWebsiteMatch: 0,
                        searchIntentAlignment: 0,
                        domainQuality: 0,
                        externalCorroboration: 0,
                        nameUniqueness: 0,
                    },
                    penalties: {
                        multipleStrongCandidates: 0,
                        genericName: 0,
                        weakHomepageSignals: 0,
                    },
                    confidence: 0,
                });
            }
        }
    }

    return Array.from(candidateMap.values());
}

/**
 * Step 5: Validate and score candidates
 * 
 * Signal A: Official website match (+0.35)
 * - Title contains company name
 * - Snippet contains company name
 */
async function scoreOfficialWebsiteMatch(
    candidate: CompanyCandidate,
    normalizedName: string
): Promise<number> {
    const titleNormalized = normalizeCompanyName(candidate.title);
    const snippetNormalized = normalizeCompanyName(candidate.snippet);

    let score = 0;

    // Title match is strongest
    if (titleNormalized.includes(normalizedName) || normalizedName.includes(titleNormalized)) {
        score += 0.25;
    }

    // Snippet match is good
    if (snippetNormalized.includes(normalizedName)) {
        score += 0.10;
    }

    return Math.min(score, SIGNAL_WEIGHTS.OFFICIAL_WEBSITE_MATCH);
}

/**
 * Signal B: Search intent alignment (+0.20)
 * - Found via "official website" query
 */
function scoreSearchIntentAlignment(candidate: CompanyCandidate): number {
    if (candidate.querySource.includes("official website")) {
        return SIGNAL_WEIGHTS.SEARCH_INTENT_ALIGNMENT;
    }
    if (candidate.querySource.includes("about us")) {
        return 0.15;
    }
    return 0.10; // Generic "company" query
}

/**
 * Signal C: Domain quality (+0.15)
 * - HTTPS enabled (we can check from URL)
 * - Position in search results (proxy for trust)
 */
function scoreDomainQuality(candidate: CompanyCandidate): number {
    let score = 0;

    // HTTPS enabled
    if (candidate.websiteUrl.startsWith("https://")) {
        score += 0.05;
    }

    // High search position (1-3)
    if (candidate.searchPosition <= 3) {
        score += 0.10;
    } else if (candidate.searchPosition <= 5) {
        score += 0.05;
    }

    return Math.min(score, SIGNAL_WEIGHTS.DOMAIN_QUALITY);
}

/**
 * Signal D: External corroboration (+0.10, reduced from 0.20)
 * - Weak signal: just checks if platforms are mentioned in snippet
 * - NOT real corroboration (that would require actual link verification)
 * - SEO blogs mention "LinkedIn" all the time, so this is noisy
 */
function scoreExternalCorroboration(candidate: CompanyCandidate): number {
    const snippet = candidate.snippet.toLowerCase();
    let score = 0;

    // Conservative scoring: mentions are weak signals
    if (snippet.includes("linkedin")) score += 0.03;
    if (snippet.includes("github")) score += 0.03;
    if (snippet.includes("product hunt")) score += 0.04;

    return Math.min(score, SIGNAL_WEIGHTS.EXTERNAL_CORROBORATION);
}

/**
 * Signal E: Name uniqueness (+0.10)
 * - Based on how specific the name is
 */
function scoreNameUniqueness(normalizedName: string, totalCandidates: number): number {
    const words = normalizedName.split(/\s+/);

    // Single word, 4+ chars, few candidates = unique
    if (words.length === 1 && normalizedName.length >= 4 && totalCandidates <= 3) {
        return SIGNAL_WEIGHTS.NAME_UNIQUENESS;
    }

    // Multi-word names are more unique
    if (words.length >= 2 && totalCandidates <= 3) {
        return SIGNAL_WEIGHTS.NAME_UNIQUENESS;
    }

    // Generic single words
    if (words.length === 1 && normalizedName.length < 4) {
        return 0;
    }

    // Many candidates suggest generic name
    if (totalCandidates > 5) {
        return 0.03;
    }

    return 0.05;
}

/**
 * Check for generic name penalty
 */
function checkGenericNamePenalty(normalizedName: string): boolean {
    const genericWords = [
        "global", "solutions", "technologies", "services",
        "consulting", "partners", "group", "international",
        "digital", "systems", "software", "tech"
    ];

    return genericWords.some(word => normalizedName.includes(word));
}

/**
 * Check for weak homepage signals
 */
function checkWeakHomepageSignals(candidate: CompanyCandidate): boolean {
    const snippet = candidate.snippet.toLowerCase();

    // Parked domain indicators
    if (snippet.includes("domain for sale") ||
        snippet.includes("buy this domain") ||
        snippet.includes("parked domain") ||
        snippet.includes("coming soon")) {
        return true;
    }

    // Very short snippet (thin content)
    if (snippet.length < 50) {
        return true;
    }

    return false;
}

/**
 * Step 6: Score all candidates
 */
async function scoreCandidates(
    candidates: CompanyCandidate[],
    normalizedName: string
): Promise<CompanyCandidate[]> {
    // Score each candidate
    for (const candidate of candidates) {
        // Signals
        candidate.signals.officialWebsiteMatch = await scoreOfficialWebsiteMatch(candidate, normalizedName);
        candidate.signals.searchIntentAlignment = scoreSearchIntentAlignment(candidate);
        candidate.signals.domainQuality = scoreDomainQuality(candidate);
        candidate.signals.externalCorroboration = scoreExternalCorroboration(candidate);
        candidate.signals.nameUniqueness = scoreNameUniqueness(normalizedName, candidates.length);

        // Penalties
        if (checkGenericNamePenalty(normalizedName)) {
            candidate.penalties.genericName = PENALTIES.GENERIC_NAME;
        }

        if (checkWeakHomepageSignals(candidate)) {
            candidate.penalties.weakHomepageSignals = PENALTIES.WEAK_HOMEPAGE_SIGNALS;
        }

        // Calculate base confidence
        const signalSum = Object.values(candidate.signals).reduce((a, b) => a + b, 0);
        const penaltySum = Object.values(candidate.penalties).reduce((a, b) => a + b, 0);

        candidate.confidence = Math.max(0, Math.min(1.0, signalSum - penaltySum));
    }

    // Apply multiple candidates penalty if needed
    // Only penalize the top candidate (others are already losers)
    const sortedByConfidence = [...candidates].sort((a, b) => b.confidence - a.confidence);

    if (sortedByConfidence.length >= 2) {
        const top1 = sortedByConfidence[0];
        const top2 = sortedByConfidence[1];

        if (top1 && top2 && Math.abs(top1.confidence - top2.confidence) < 0.10) {
            // Top candidates are too close - penalize only the top one
            top1.penalties.multipleStrongCandidates = PENALTIES.MULTIPLE_STRONG_CANDIDATES;
            const penaltySum = Object.values(top1.penalties).reduce((a, b) => a + b, 0);
            const signalSum = Object.values(top1.signals).reduce((a, b) => a + b, 0);
            top1.confidence = Math.max(0, Math.min(1.0, signalSum - penaltySum));
        }
    }

    // Log signal breakdown for debugging (gold for debugging)
    for (const candidate of sortedByConfidence.slice(0, 3)) {
        logger.debug("📊 Candidate scoring breakdown", {
            domain: candidate.domain,
            signals: candidate.signals,
            penalties: candidate.penalties,
            finalConfidence: candidate.confidence.toFixed(3),
        });
    }

    return candidates.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Determine confidence level from numeric confidence
 */
function getConfidenceLevel(confidence: number): "HIGH" | "MEDIUM" | "LOW" | "FAIL" {
    if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) return "HIGH";
    if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) return "MEDIUM";
    if (confidence >= CONFIDENCE_THRESHOLDS.LOW) return "LOW";
    return "FAIL";
}

/**
 * Extract canonical company name from candidate
 */
function extractCanonicalName(candidate: CompanyCandidate, originalName: string): string {
    // Try to extract from title
    let canonical = candidate.title;

    // Clean up common patterns
    canonical = canonical
        .replace(/\s*[-–|]\s*.+$/, "") // Remove " - tagline" or " | tagline"
        .replace(/\s+Inc\.?$/i, "")
        .replace(/\s+LLC\.?$/i, "")
        .replace(/\s+Ltd\.?$/i, "")
        .replace(/\s+Corp\.?$/i, "")
        .replace(/\s+Corporation$/i, "")
        .trim();

    // If cleaned name is too short or weird, use original
    if (canonical.length < 2 || canonical.length > 100) {
        canonical = originalName;
    }

    return canonical;
}

/**
 * Main resolver function
 * 
 * @param companyName - The company name to resolve (e.g., "Stripe" or "Linear")
 * @returns Company resolution result with confidence score
 */
export async function resolveCompanyIdentityFromName(
    companyName: string
): Promise<CompanyNameResolutionResult> {
    try {
        if (!companyName || companyName.trim().length === 0) {
            logger.debug("🏢 CompanyNameResolver: Empty company name");
            return {
                canonicalCompanyName: null,
                websiteUrl: null,
                domain: null,
                confidence: 0,
                confidenceLevel: "FAIL",
                reason: "Empty company name",
            };
        }

        logger.info("🏢 CompanyNameResolver: Resolving company", { companyName });

        // Step 1: Normalize
        const normalizedName = normalizeCompanyName(companyName);

        if (normalizedName.length === 0) {
            return {
                canonicalCompanyName: null,
                websiteUrl: null,
                domain: null,
                confidence: 0,
                confidenceLevel: "FAIL",
                reason: "Invalid company name after normalization",
            };
        }

        // Step 2: Generate queries
        const queries = generateSearchQueries(companyName);

        // Step 3: Perform searches
        const responses: Array<{ query: string; response: SerperResponse }> = [];

        for (const query of queries) {
            const response = await performSerperSearch(query);
            if (response) {
                responses.push({ query, response });
            }
        }

        if (responses.length === 0) {
            logger.warn("🏢 CompanyNameResolver: No search results", { companyName });
            return {
                canonicalCompanyName: null,
                websiteUrl: null,
                domain: null,
                confidence: 0,
                confidenceLevel: "FAIL",
                reason: "No search results available",
            };
        }

        // Step 4: Extract candidates
        const candidates = extractCandidates(responses, normalizedName);

        if (candidates.length === 0) {
            logger.warn("🏢 CompanyNameResolver: No valid candidates", { companyName });
            return {
                canonicalCompanyName: null,
                websiteUrl: null,
                domain: null,
                confidence: 0,
                confidenceLevel: "FAIL",
                reason: "No valid candidates found after filtering",
            };
        }

        // Step 5-6: Score candidates
        const scoredCandidates = await scoreCandidates(candidates, normalizedName);

        // Step 7: Make decision
        const bestCandidate = scoredCandidates[0];

        if (!bestCandidate) {
            return {
                canonicalCompanyName: null,
                websiteUrl: null,
                domain: null,
                confidence: 0,
                confidenceLevel: "FAIL",
                reason: "No candidates passed scoring",
            };
        }

        const confidenceLevel = getConfidenceLevel(bestCandidate.confidence);

        // Conservative: cap confidence at 0.90 for safety
        // Only exceed 0.90 if: single candidate, zero penalties, strong signals
        let cappedConfidence = bestCandidate.confidence;
        const penaltySum = Object.values(bestCandidate.penalties).reduce((a, b) => a + b, 0);

        if (penaltySum > 0 || scoredCandidates.length > 1) {
            cappedConfidence = Math.min(0.90, cappedConfidence);
        } else {
            cappedConfidence = Math.min(0.95, cappedConfidence);
        }

        // Generate reason for LOW or FAIL confidence
        let reason: string | undefined;
        if (confidenceLevel === "LOW" || confidenceLevel === "FAIL") {
            const reasons: string[] = [];
            if (bestCandidate.penalties.multipleStrongCandidates > 0) {
                reasons.push("Multiple strong candidates");
            }
            if (bestCandidate.penalties.genericName > 0) {
                reasons.push("Generic company name");
            }
            if (bestCandidate.penalties.weakHomepageSignals > 0) {
                reasons.push("Weak homepage signals");
            }
            if (bestCandidate.signals.officialWebsiteMatch < 0.20) {
                reasons.push("Low website match quality");
            }
            if (scoredCandidates.length > 5) {
                reasons.push("Too many candidates");
            }
            reason = reasons.join(", ") || "Low confidence";
        }

        logger.info("🏢 CompanyNameResolver: Resolution complete", {
            companyName,
            canonicalName: extractCanonicalName(bestCandidate, companyName),
            domain: bestCandidate.domain,
            confidence: cappedConfidence,
            confidenceLevel,
            candidatesEvaluated: scoredCandidates.length,
            reason,
        });

        return {
            canonicalCompanyName: extractCanonicalName(bestCandidate, companyName),
            websiteUrl: bestCandidate.websiteUrl,
            domain: bestCandidate.domain,
            confidence: cappedConfidence,
            confidenceLevel,
            reason,
        };

    } catch (error) {
        logger.error("🏢 CompanyNameResolver: Unexpected error", {
            companyName,
            error: error instanceof Error ? error.message : "Unknown error",
        });

        return {
            canonicalCompanyName: null,
            websiteUrl: null,
            domain: null,
            confidence: 0,
            confidenceLevel: "FAIL",
            reason: error instanceof Error ? error.message : "Unexpected error",
        };
    }
}
