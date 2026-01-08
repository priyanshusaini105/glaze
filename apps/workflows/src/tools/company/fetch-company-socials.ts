/**
 * FetchCompanySocials Tool
 * 
 * Deterministic extraction of verified official social links from company website.
 * 
 * Input: websiteUrl
 * Output: Verified social links (twitter, linkedin, github, facebook, instagram)
 * 
 * RULES:
 * - Never guess handles
 * - Never search blindly
 * - Never return personal accounts
 * - Never return unofficial pages
 * - If not found → return null, not fiction
 * 
 * Flow:
 * 1. Crawl trusted pages only (/, /about, /contact, footer)
 * 2. Extract outbound links to known social domains
 * 3. Normalize + classify links
 * 4. Validate ownership
 * 5. De-duplicate + resolve conflicts
 * 6. Return verified socials
 */

import { logger } from "@trigger.dev/sdk";
import * as cheerio from "cheerio";

// ============================================================
// TYPES
// ============================================================

export interface SocialLink {
    url: string;
    handle?: string;
    confidence: number;
    source: string; // Which page we found it on
}

export interface CompanySocials {
    twitter: SocialLink | null;
    linkedin: SocialLink | null;
    github: SocialLink | null;
    facebook: SocialLink | null;
    instagram: SocialLink | null;
}

export interface FetchCompanySocialsResult {
    socials: CompanySocials;
    pagesChecked: string[];
    linksFound: number;
    linksValidated: number;
}

// ============================================================
// CONSTANTS
// ============================================================

/**
 * Trusted paths to crawl (companies put socials here by convention)
 */
const TRUSTED_PATHS = [
    "/",
    "/about",
    "/about-us",
    "/company",
    "/contact",
    "/contact-us",
];

/**
 * Known social domains with their platform type
 */
const SOCIAL_DOMAINS: Record<string, string> = {
    "twitter.com": "twitter",
    "x.com": "twitter",
    "linkedin.com": "linkedin",
    "www.linkedin.com": "linkedin",
    "github.com": "github",
    "facebook.com": "facebook",
    "www.facebook.com": "facebook",
    "fb.com": "facebook",
    "instagram.com": "instagram",
    "www.instagram.com": "instagram",
};

/**
 * Patterns to REJECT for each platform
 */
const REJECT_PATTERNS: Record<string, RegExp[]> = {
    twitter: [
        /\/intent\//i,
        /\/share\?/i,
        /\/hashtag\//i,
        /\/search\?/i,
        /\/i\//i,  // Internal Twitter links
        /\/status\//i,  // Individual tweets
    ],
    linkedin: [
        /\/in\//i,     // Personal profiles
        /\/school\//i,  // Schools
        /\/groups\//i,  // Groups
        /\/jobs\//i,    // Jobs
        /\/pulse\//i,   // Articles
        /\/posts\//i,   // Posts
    ],
    github: [
        /\/blob\//i,    // File views
        /\/tree\//i,    // Directory views
        /\/issues\//i,  // Issues
        /\/pull\//i,    // PRs
        /\/commit\//i,  // Commits
        /\/releases\//i, // Releases
    ],
    facebook: [
        /\/sharer\//i,
        /\/share\?/i,
        /\/dialog\//i,
        /\/photo/i,
        /\/video/i,
    ],
    instagram: [
        /\/p\//i,       // Individual posts
        /\/reel\//i,    // Reels
        /\/stories\//i, // Stories
    ],
};

/**
 * Patterns to ACCEPT for each platform (canonical patterns)
 */
const ACCEPT_PATTERNS: Record<string, RegExp> = {
    twitter: /^https?:\/\/(www\.)?(twitter|x)\.com\/([a-zA-Z0-9_]+)\/?$/,
    linkedin: /^https?:\/\/(www\.)?linkedin\.com\/company\/([a-zA-Z0-9\-_]+)\/?$/,
    github: /^https?:\/\/(www\.)?github\.com\/([a-zA-Z0-9\-_]+)\/?$/,
    facebook: /^https?:\/\/(www\.)?(facebook|fb)\.com\/([a-zA-Z0-9.\-_]+)\/?$/,
    instagram: /^https?:\/\/(www\.)?instagram\.com\/([a-zA-Z0-9._]+)\/?$/,
};

// ============================================================
// STEP 1: CRAWL TRUSTED PAGES
// ============================================================

interface PageContent {
    path: string;
    html: string;
    success: boolean;
}

/**
 * Fetch a single page with timeout
 */
async function fetchPage(url: string, timeout = 8000): Promise<string | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; GlazeBot/1.0)",
                "Accept": "text/html",
            },
            redirect: "follow",
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return null;
        }

        return await response.text();
    } catch {
        clearTimeout(timeoutId);
        return null;
    }
}

/**
 * Crawl trusted pages only
 */
async function crawlTrustedPages(baseUrl: string): Promise<PageContent[]> {
    const results: PageContent[] = [];

    // Normalize base URL
    let normalizedBase = baseUrl.trim();
    if (!normalizedBase.startsWith("http://") && !normalizedBase.startsWith("https://")) {
        normalizedBase = `https://${normalizedBase}`;
    }
    // Remove trailing slash
    normalizedBase = normalizedBase.replace(/\/$/, "");

    logger.info("🌐 FetchCompanySocials: Crawling trusted pages", {
        baseUrl: normalizedBase,
        paths: TRUSTED_PATHS,
    });

    // Fetch all trusted pages in parallel
    const fetchPromises = TRUSTED_PATHS.map(async (path) => {
        const url = `${normalizedBase}${path}`;
        const html = await fetchPage(url);
        return {
            path,
            html: html || "",
            success: html !== null,
        };
    });

    const fetched = await Promise.all(fetchPromises);

    for (const page of fetched) {
        if (page.success) {
            results.push(page);
        }
    }

    logger.info("✅ FetchCompanySocials: Pages fetched", {
        total: TRUSTED_PATHS.length,
        successful: results.length,
        paths: results.map(r => r.path),
    });

    return results;
}

// ============================================================
// STEP 2: EXTRACT OUTBOUND LINKS
// ============================================================

interface RawSocialLink {
    url: string;
    platform: string;
    source: string;
    inFooter: boolean;
    inHeader: boolean;
}

/**
 * Extract social links from HTML
 */
function extractSocialLinks(html: string, sourcePath: string): RawSocialLink[] {
    const $ = cheerio.load(html);
    const links: RawSocialLink[] = [];
    const seen = new Set<string>();

    // Helper to check if element is in footer/header
    // Using 'any' for el type since cheerio's Element type is not exported properly
    const isInFooter = (el: unknown): boolean => {
        return $(el as Parameters<typeof $>[0]).closest("footer").length > 0 ||
            $(el as Parameters<typeof $>[0]).closest("[class*='footer']").length > 0 ||
            $(el as Parameters<typeof $>[0]).closest("[id*='footer']").length > 0;
    };

    const isInHeader = (el: unknown): boolean => {
        return $(el as Parameters<typeof $>[0]).closest("header").length > 0 ||
            $(el as Parameters<typeof $>[0]).closest("[class*='header']").length > 0 ||
            $(el as Parameters<typeof $>[0]).closest("nav").length > 0;
    };

    // Find all anchor tags
    $("a[href]").each((_, el) => {
        const href = $(el).attr("href");
        if (!href) return;

        try {
            // Handle relative URLs
            const url = new URL(href, "https://example.com");
            const hostname = url.hostname.toLowerCase();

            // Check if it's a social domain
            const platform = SOCIAL_DOMAINS[hostname] || SOCIAL_DOMAINS[hostname.replace("www.", "")];
            if (!platform) return;

            // Normalize URL
            const normalizedUrl = `${url.protocol}//${url.hostname}${url.pathname}`.replace(/\/$/, "");

            // Skip duplicates
            if (seen.has(normalizedUrl)) return;
            seen.add(normalizedUrl);

            links.push({
                url: normalizedUrl,
                platform,
                source: sourcePath,
                inFooter: isInFooter(el),
                inHeader: isInHeader(el),
            });
        } catch {
            // Invalid URL, skip
        }
    });

    return links;
}

// ============================================================
// STEP 3: NORMALIZE LINKS (REMOVE GARBAGE)
// ============================================================

interface NormalizedLink extends RawSocialLink {
    handle: string | null;
    isValid: boolean;
    rejectReason?: string;
}

/**
 * Normalize and validate a social link
 */
function normalizeLink(link: RawSocialLink): NormalizedLink {
    const result: NormalizedLink = {
        ...link,
        handle: null,
        isValid: false,
    };

    // Check reject patterns
    const rejectPatterns = REJECT_PATTERNS[link.platform] || [];
    for (const pattern of rejectPatterns) {
        if (pattern.test(link.url)) {
            result.rejectReason = `Matches reject pattern: ${pattern}`;
            return result;
        }
    }

    // Check accept pattern and extract handle
    const acceptPattern = ACCEPT_PATTERNS[link.platform];
    if (!acceptPattern) {
        result.rejectReason = `No accept pattern for platform: ${link.platform}`;
        return result;
    }

    const match = link.url.match(acceptPattern);
    if (!match) {
        result.rejectReason = `Does not match canonical pattern`;
        return result;
    }

    // Extract handle from the regex match
    result.handle = match[match.length - 1] || null;
    result.isValid = true;

    return result;
}

// ============================================================
// STEP 4: OWNERSHIP VALIDATION
// ============================================================

interface ValidatedLink extends NormalizedLink {
    confidence: number;
    validationNotes: string[];
}

/**
 * Validate that a social link belongs to the company
 */
function validateOwnership(
    link: NormalizedLink,
    companyName: string,
    domain: string
): ValidatedLink {
    const result: ValidatedLink = {
        ...link,
        confidence: 0,
        validationNotes: [],
    };

    if (!link.isValid || !link.handle) {
        return result;
    }

    const normalizedCompany = companyName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedHandle = link.handle.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedDomain = domain.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/com|org|io|co|net/g, "");

    // Base confidence from being found on official site
    let confidence = 0.5;

    // Validation rules per platform
    switch (link.platform) {
        case "twitter":
            // Handle matches company name
            if (normalizedHandle === normalizedCompany) {
                confidence += 0.35;
                result.validationNotes.push("Handle matches company name exactly");
            } else if (normalizedHandle.includes(normalizedCompany) || normalizedCompany.includes(normalizedHandle)) {
                confidence += 0.2;
                result.validationNotes.push("Handle partially matches company name");
            }
            // Handle matches domain
            if (normalizedHandle === normalizedDomain) {
                confidence += 0.1;
                result.validationNotes.push("Handle matches domain");
            }
            break;

        case "linkedin":
            // Must be /company/ (already validated in normalize step)
            confidence += 0.2;
            result.validationNotes.push("Is company page (not personal)");

            // Slug matches company name
            if (normalizedHandle === normalizedCompany) {
                confidence += 0.25;
                result.validationNotes.push("Slug matches company name exactly");
            } else if (normalizedHandle.includes(normalizedCompany) || normalizedCompany.includes(normalizedHandle)) {
                confidence += 0.15;
                result.validationNotes.push("Slug partially matches company name");
            }
            break;

        case "github":
            // Handle matches company/domain
            if (normalizedHandle === normalizedCompany || normalizedHandle === normalizedDomain) {
                confidence += 0.3;
                result.validationNotes.push("Org matches company/domain");
            } else if (normalizedHandle.includes(normalizedCompany) || normalizedCompany.includes(normalizedHandle)) {
                confidence += 0.15;
                result.validationNotes.push("Org partially matches company name");
            }
            break;

        case "facebook":
        case "instagram":
            // Handle matches company name
            if (normalizedHandle === normalizedCompany) {
                confidence += 0.25;
                result.validationNotes.push("Handle matches company name");
            } else if (normalizedHandle.includes(normalizedCompany) || normalizedCompany.includes(normalizedHandle)) {
                confidence += 0.1;
                result.validationNotes.push("Handle partially matches company name");
            }
            break;
    }

    // Bonus: Found in footer (high signal)
    if (link.inFooter) {
        confidence += 0.1;
        result.validationNotes.push("Found in footer");
    }

    // Bonus: Found on homepage
    if (link.source === "/") {
        confidence += 0.05;
        result.validationNotes.push("Found on homepage");
    }

    result.confidence = Math.min(0.98, confidence);

    return result;
}

// ============================================================
// STEP 5: DE-DUPLICATION AND CONFLICT RESOLUTION
// ============================================================

/**
 * Select the best link for each platform
 */
function selectBestLinks(links: ValidatedLink[]): Map<string, ValidatedLink> {
    const byPlatform = new Map<string, ValidatedLink[]>();

    // Group by platform
    for (const link of links) {
        if (link.confidence < 0.5) continue; // Skip low confidence

        const existing = byPlatform.get(link.platform) || [];
        existing.push(link);
        byPlatform.set(link.platform, existing);
    }

    const best = new Map<string, ValidatedLink>();

    // Select best for each platform
    for (const [platform, candidates] of byPlatform) {
        if (candidates.length === 0) continue;

        // Sort by confidence descending
        candidates.sort((a, b) => b.confidence - a.confidence);

        const top = candidates[0]!;
        const second = candidates[1];

        // If top two are too close, it's ambiguous - return none
        if (second && (top.confidence - second.confidence) < 0.1) {
            logger.warn("⚠️ FetchCompanySocials: Ambiguous candidates, skipping", {
                platform,
                top: { handle: top.handle, confidence: top.confidence },
                second: { handle: second.handle, confidence: second.confidence },
            });
            continue;
        }

        // Must have minimum confidence
        if (top.confidence >= 0.6) {
            best.set(platform, top);
        }
    }

    return best;
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Extract verified company social links from website
 */
export async function fetchCompanySocials(
    websiteUrl: string,
    companyName?: string
): Promise<FetchCompanySocialsResult> {
    logger.info("🔗 FetchCompanySocials: Starting", { websiteUrl, companyName });

    // Normalize URL and extract domain
    let normalizedUrl = websiteUrl.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        normalizedUrl = `https://${normalizedUrl}`;
    }

    const urlObj = new URL(normalizedUrl);
    const domain = urlObj.hostname.replace("www.", "");
    const inferredCompanyName = companyName || domain.split(".")[0] || domain;

    // Step 1: Crawl trusted pages
    const pages = await crawlTrustedPages(normalizedUrl);

    if (pages.length === 0) {
        logger.warn("⚠️ FetchCompanySocials: No pages could be fetched", { websiteUrl });
        return {
            socials: {
                twitter: null,
                linkedin: null,
                github: null,
                facebook: null,
                instagram: null,
            },
            pagesChecked: [],
            linksFound: 0,
            linksValidated: 0,
        };
    }

    // Step 2: Extract all social links
    const allRawLinks: RawSocialLink[] = [];
    for (const page of pages) {
        const links = extractSocialLinks(page.html, page.path);
        allRawLinks.push(...links);
    }

    logger.info("📋 FetchCompanySocials: Raw links extracted", {
        count: allRawLinks.length,
        breakdown: allRawLinks.reduce((acc, l) => {
            acc[l.platform] = (acc[l.platform] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    });

    // Step 3: Normalize links
    const normalizedLinks = allRawLinks.map(normalizeLink);
    const validNormalized = normalizedLinks.filter(l => l.isValid);

    logger.info("🔧 FetchCompanySocials: Links normalized", {
        total: normalizedLinks.length,
        valid: validNormalized.length,
        rejected: normalizedLinks.filter(l => !l.isValid).map(l => ({
            url: l.url,
            reason: l.rejectReason,
        })),
    });

    // Step 4: Validate ownership
    const validatedLinks = validNormalized.map(link =>
        validateOwnership(link, inferredCompanyName, domain)
    );

    logger.info("✅ FetchCompanySocials: Ownership validated", {
        count: validatedLinks.length,
        withHighConfidence: validatedLinks.filter(l => l.confidence >= 0.7).length,
    });

    // Step 5: Select best links
    const bestLinks = selectBestLinks(validatedLinks);

    // Build result
    const socials: CompanySocials = {
        twitter: null,
        linkedin: null,
        github: null,
        facebook: null,
        instagram: null,
    };

    for (const [platform, link] of bestLinks) {
        const socialLink: SocialLink = {
            url: link.url,
            handle: link.handle || undefined,
            confidence: link.confidence,
            source: link.source,
        };

        switch (platform) {
            case "twitter":
                socials.twitter = socialLink;
                break;
            case "linkedin":
                socials.linkedin = socialLink;
                break;
            case "github":
                socials.github = socialLink;
                break;
            case "facebook":
                socials.facebook = socialLink;
                break;
            case "instagram":
                socials.instagram = socialLink;
                break;
        }
    }

    logger.info("🏁 FetchCompanySocials: Complete", {
        websiteUrl,
        found: {
            twitter: !!socials.twitter,
            linkedin: !!socials.linkedin,
            github: !!socials.github,
            facebook: !!socials.facebook,
            instagram: !!socials.instagram,
        },
    });

    return {
        socials,
        pagesChecked: pages.map(p => p.path),
        linksFound: allRawLinks.length,
        linksValidated: validatedLinks.filter(l => l.confidence >= 0.6).length,
    };
}

// ============================================================
// PROVIDER CLASS
// ============================================================

/**
 * FetchCompanySocials Provider for integration with enrichment system
 */
export class FetchCompanySocialsProvider {
    name = "fetch_company_socials";
    tier = "free" as const;
    costCents = 0;

    async enrich(websiteUrl: string, companyName?: string): Promise<FetchCompanySocialsResult> {
        return fetchCompanySocials(websiteUrl, companyName);
    }
}

// Export singleton
export const fetchCompanySocialsProvider = new FetchCompanySocialsProvider();
