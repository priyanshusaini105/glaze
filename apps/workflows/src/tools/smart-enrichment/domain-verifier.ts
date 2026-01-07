/**
 * Domain Verification Tool
 * 
 * Layer 2: Lightweight verification of candidate domains
 * 
 * For each candidate, check:
 * 1. Does homepage title contain company name?
 * 2. Does homepage text contain industry keywords?
 * 3. Is this a directory/marketplace/reseller?
 * 4. Is it parked or empty?
 * 
 * Returns a verification score with reasons.
 */

import { logger } from "@trigger.dev/sdk";
import type { SearchCandidate } from "./candidate-collector";

export interface VerificationResult {
    candidate: SearchCandidate;
    score: number;
    reasons: string[];
    warnings: string[];
    verified: boolean;
}

// Keywords that suggest a directory/marketplace (reduce trust)
const DIRECTORY_KEYWORDS = [
    'directory', 'listing', 'find companies', 'business listings',
    'compare', 'reviews', 'ratings', 'top 10', 'best companies',
    'marketplace', 'vendor', 'suppliers list', 'companies like',
];

// Keywords that suggest a parked/empty page
const PARKED_KEYWORDS = [
    'domain for sale', 'buy this domain', 'parked', 'coming soon',
    'under construction', 'this domain', 'domain parking',
];

/**
 * Fetch homepage metadata (title, description) with lightweight request
 */
async function fetchHomepageMetadata(domain: string): Promise<{
    title: string | null;
    description: string | null;
    isReachable: boolean;
}> {
    const url = `https://${domain}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; GlazeBot/1.0)",
                "Accept": "text/html",
            },
            redirect: "follow",
        });

        clearTimeout(timeout);

        if (!response.ok) {
            return { title: null, description: null, isReachable: false };
        }

        const html = await response.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch?.[1]?.trim() ?? null;

        // Extract meta description
        const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
            || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
        const description = descMatch?.[1]?.trim() ?? null;

        return { title, description, isReachable: true };
    } catch {
        clearTimeout(timeout);
        return { title: null, description: null, isReachable: false };
    }
}

/**
 * Normalize text for comparison (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Extract base domain name without TLD
 */
function extractBaseDomain(domain: string): string {
    // Remove common TLDs and get base domain
    const parts = domain.toLowerCase().split('.');
    // Handle cases like 'reddit.com', 'business.reddit.com', 'redditinc.com'
    // Return the main identifying part
    const basePart = parts[0]!;
    return basePart.replace(/[^a-z0-9]/g, '');
}

/**
 * Check if domain is canonical (domain name = company name)
 * e.g., "reddit.com" for "Reddit" or "google.com" for "Google"
 */
function isCanonicalDomain(domain: string, companyName: string): boolean {
    const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseDomain = extractBaseDomain(domain);

    // Exact match: reddit.com for "Reddit"
    if (baseDomain === normalizedCompany) {
        return true;
    }

    // Handle "Inc", "Corp", "LLC" suffixes in domain: redditinc.com ≠ canonical for "Reddit"
    // Only match if company already has that suffix
    return false;
}

/**
 * Check if text contains company name (fuzzy match)
 */
function containsCompanyName(text: string, companyName: string): boolean {
    const normalizedText = normalizeText(text);
    const normalizedCompany = normalizeText(companyName);

    // Exact match
    if (normalizedText.includes(normalizedCompany)) {
        return true;
    }

    // Word-by-word match (company names like "Cloud Scale Solutions")
    const companyWords = normalizedCompany.split(' ').filter(w => w.length > 2);
    const matchedWords = companyWords.filter(word => normalizedText.includes(word));

    // At least 2/3 of significant words must match
    return matchedWords.length >= Math.ceil(companyWords.length * 0.66);
}

/**
 * Check if text contains industry keywords
 */
function containsIndustryKeywords(text: string, industry?: string): boolean {
    if (!industry) return false;

    const normalizedText = normalizeText(text);
    const industryWords = normalizeText(industry).split(' ').filter(w => w.length > 3);

    return industryWords.some(word => normalizedText.includes(word));
}

/**
 * Check if this looks like a directory page
 */
function isDirectoryPage(title: string, snippet: string): boolean {
    const combined = normalizeText(`${title} ${snippet}`);
    return DIRECTORY_KEYWORDS.some(keyword => combined.includes(keyword));
}

/**
 * Check if this looks like a parked domain
 */
function isParkedDomain(title: string, description: string | null): boolean {
    const combined = normalizeText(`${title} ${description || ''}`);
    return PARKED_KEYWORDS.some(keyword => combined.includes(keyword));
}

/**
 * Verify a single candidate domain
 */
export async function verifyCandidate(
    candidate: SearchCandidate,
    companyName: string,
    industry?: string
): Promise<VerificationResult> {
    const reasons: string[] = [];
    const warnings: string[] = [];
    let score = 0.3; // Base score

    logger.info("🔎 DomainVerifier: Checking candidate", {
        domain: candidate.domain,
        companyName,
    });

    // Check 0: CANONICAL DOMAIN BONUS (most important signal)
    // If domain exactly matches company name, this is almost certainly correct
    if (isCanonicalDomain(candidate.domain, companyName)) {
        score += 0.25;
        reasons.push("canonical_domain");
    }

    // Check 1: Company name in search snippet/title (from Serper)
    const searchText = `${candidate.title} ${candidate.snippet}`;
    if (containsCompanyName(searchText, companyName)) {
        score += 0.25;
        reasons.push("name_match_serp");
    }

    // Check 2: Industry keywords in search results
    if (containsIndustryKeywords(searchText, industry)) {
        score += 0.15;
        reasons.push("industry_match_serp");
    }

    // Check 3: Is it a directory page? (negative signal)
    if (isDirectoryPage(candidate.title, candidate.snippet)) {
        score -= 0.3;
        warnings.push("directory_page");
    }

    // Check 4: Fetch actual homepage (lightweight)
    const metadata = await fetchHomepageMetadata(candidate.domain);

    if (!metadata.isReachable) {
        score -= 0.2;
        warnings.push("unreachable");
    } else {
        // Check company name in actual homepage title
        if (metadata.title && containsCompanyName(metadata.title, companyName)) {
            score += 0.2;
            reasons.push("name_match_homepage");
        }

        // Check for parked domain
        if (metadata.title && isParkedDomain(metadata.title, metadata.description)) {
            score -= 0.4;
            warnings.push("parked_domain");
        }

        // Check industry in homepage description
        if (metadata.description && containsIndustryKeywords(metadata.description, industry)) {
            score += 0.1;
            reasons.push("industry_match_homepage");
        }
    }

    // Clamp score between 0 and 1
    score = Math.max(0, Math.min(1, score));

    const result: VerificationResult = {
        candidate,
        score,
        reasons,
        warnings,
        verified: score >= 0.6,
    };

    logger.info("✅ DomainVerifier: Verification complete", {
        domain: candidate.domain,
        score: score.toFixed(2),
        reasons,
        warnings,
    });

    return result;
}

/**
 * Verify all candidates and return sorted results
 * 
 * FAST PATH: If first candidate is canonical (domain = company name),
 * we only verify the top 2 candidates to save HTTP requests.
 */
export async function verifyCandidates(
    candidates: SearchCandidate[],
    companyName: string,
    industry?: string
): Promise<VerificationResult[]> {
    if (candidates.length === 0) return [];

    // Check if first candidate is canonical for fast path
    const firstCandidate = candidates[0]!;
    const firstIsCanonical = isCanonicalDomain(firstCandidate.domain, companyName);

    // If first is canonical, only verify top 2 (the canonical + one backup)
    const candidatesToVerify = firstIsCanonical
        ? candidates.slice(0, 2)
        : candidates;

    if (firstIsCanonical) {
        logger.info("⚡ DomainVerifier: Fast path - canonical first, limiting verification", {
            companyName,
            canonicalDomain: firstCandidate.domain,
            verifyingCount: candidatesToVerify.length,
        });
    }

    const results = await Promise.all(
        candidatesToVerify.map(c => verifyCandidate(c, companyName, industry))
    );

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
}
