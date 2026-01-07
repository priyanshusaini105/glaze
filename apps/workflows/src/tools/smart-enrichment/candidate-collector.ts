/**
 * Candidate Collector
 * 
 * Layer 1: Generate multiple candidates using Serper
 * 
 * Instead of picking the first result, collect top N candidates
 * from multiple search queries for later verification.
 */

import { logger } from "@trigger.dev/sdk";

const SERPER_API_KEY = process.env.SERPER_API_KEY;
const SERPER_API_URL = "https://google.serper.dev/search";

export interface SearchCandidate {
    url: string;
    domain: string;
    title: string;
    snippet: string;
    position: number;
    querySource: string;
}

export interface CandidateCollectionResult {
    candidates: SearchCandidate[];
    queries: string[];
    totalResultsScanned: number;
}

// Domains to filter out (directories, marketplaces, social)
const EXCLUDED_DOMAINS = [
    'linkedin.com',
    'facebook.com',
    'twitter.com',
    'x.com',
    'instagram.com',
    'youtube.com',
    'crunchbase.com',
    'zoominfo.com',
    'bloomberg.com',
    'forbes.com',
    'wikipedia.org',
    'yelp.com',
    'glassdoor.com',
    'indeed.com',
    'pitchbook.com',
    'apollo.io',
    'dnb.com',
    'hoovers.com',
    'owler.com',
    'craft.co',
    'g2.com',
    'capterra.com',
    'trustpilot.com',
    'bbb.org',
    'manta.com',
    'yellowpages.com',
];

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '').toLowerCase();
    } catch {
        return null;
    }
}

/**
 * Check if domain should be excluded
 */
function isExcludedDomain(domain: string): boolean {
    return EXCLUDED_DOMAINS.some(excluded =>
        domain === excluded || domain.endsWith('.' + excluded)
    );
}

/**
 * Perform a Serper search and return raw results
 */
async function performSerperSearch(query: string): Promise<Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
}>> {
    if (!SERPER_API_KEY) {
        logger.warn("⚠️ CandidateCollector: No SERPER_API_KEY configured");
        return [];
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
                num: 10, // Get more results
            }),
        });

        if (!response.ok) {
            logger.error("CandidateCollector: Serper API error", {
                status: response.status,
                statusText: response.statusText,
            });
            return [];
        }

        const data = await response.json() as { organic?: Array<{ title: string; link: string; snippet: string; position: number }> };
        return data.organic || [];
    } catch (error) {
        logger.error("CandidateCollector: Network error", {
            error: error instanceof Error ? error.message : String(error),
        });
        return [];
    }
}

/**
 * Build search queries for a company
 * 
 * Query strategy:
 * 1. Primary: company name + industry + "official website" (most precise)
 * 2. Secondary: company name + "official website" (fallback)
 * 3. Tertiary: company name (broader search)
 */
function buildSearchQueries(
    companyName: string,
    industry?: string,
    location?: string
): string[] {
    const queries: string[] = [];

    // Primary query: company name + industry + "official website" (most precise)
    if (industry) {
        queries.push(`"${companyName}" ${industry} official website`);
    }

    // Secondary query: company name + "official website"
    queries.push(`"${companyName}" official website`);

    // Tertiary: just company name (broader)
    queries.push(`${companyName} company`);

    return queries;
}

/**
 * Check if domain is canonical (domain name = company name)
 * Fast-path detection to avoid unnecessary queries
 */
function isCanonicalDomain(domain: string, companyName: string): boolean {
    const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const parts = domain.toLowerCase().split('.');
    const baseDomain = parts[0]!.replace(/[^a-z0-9]/g, '');
    return baseDomain === normalizedCompany;
}

/**
 * Collect candidate domains for a company
 * 
 * FAST PATH: If first query returns canonical domain (reddit.com for "Reddit"),
 * we skip the second query and return immediately.
 * 
 * @param companyName - The company name to search for
 * @param context - Additional context (industry, location, etc.)
 * @returns Multiple candidate domains with metadata
 */
export async function collectCandidates(
    companyName: string,
    context: {
        industry?: string;
        location?: string;
        existingDomain?: string;
    } = {}
): Promise<CandidateCollectionResult> {
    logger.info("🔍 CandidateCollector: Starting candidate collection", {
        companyName,
        industry: context.industry,
    });

    const queries = buildSearchQueries(companyName, context.industry, context.location);
    const candidateMap = new Map<string, SearchCandidate>();
    let totalResults = 0;
    const usedQueries: string[] = [];

    // Run FIRST query
    const firstQuery = queries[0]!;
    usedQueries.push(firstQuery);
    const firstResults = await performSerperSearch(firstQuery);
    totalResults += firstResults.length;

    // Process first query results
    for (const result of firstResults) {
        const domain = extractDomain(result.link);
        if (!domain) continue;
        if (isExcludedDomain(domain)) continue;

        if (!candidateMap.has(domain)) {
            candidateMap.set(domain, {
                url: result.link,
                domain,
                title: result.title,
                snippet: result.snippet,
                position: result.position,
                querySource: firstQuery,
            });
        }
    }

    // FAST PATH: Check if we found a canonical domain in first query
    // If reddit.com appears for "Reddit", we don't need a second query
    const firstCandidate = Array.from(candidateMap.values())[0];
    const hasCanonicalMatch = firstCandidate && isCanonicalDomain(firstCandidate.domain, companyName);

    if (hasCanonicalMatch) {
        logger.info("⚡ CandidateCollector: Fast path - canonical domain found", {
            companyName,
            canonicalDomain: firstCandidate.domain,
        });
    } else if (queries.length > 1) {
        // No canonical match - run second query for more candidates
        const secondQuery = queries[1]!;
        usedQueries.push(secondQuery);
        const secondResults = await performSerperSearch(secondQuery);
        totalResults += secondResults.length;

        for (const result of secondResults) {
            const domain = extractDomain(result.link);
            if (!domain) continue;
            if (isExcludedDomain(domain)) continue;

            if (!candidateMap.has(domain)) {
                candidateMap.set(domain, {
                    url: result.link,
                    domain,
                    title: result.title,
                    snippet: result.snippet,
                    position: result.position,
                    querySource: secondQuery,
                });
            }
        }
    }

    const candidates = Array.from(candidateMap.values())
        .sort((a, b) => a.position - b.position)
        .slice(0, hasCanonicalMatch ? 3 : 5); // Fewer candidates if canonical found

    logger.info("✅ CandidateCollector: Found candidates", {
        companyName,
        candidateCount: candidates.length,
        domains: candidates.map(c => c.domain),
        fastPath: hasCanonicalMatch,
    });

    return {
        candidates,
        queries: usedQueries,
        totalResultsScanned: totalResults,
    };
}
