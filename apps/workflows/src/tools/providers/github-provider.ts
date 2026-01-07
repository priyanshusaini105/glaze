/**
 * GitHub Profile Provider
 * 
 * Phase 2 deterministic enrichment tool.
 * Fetches profile data from GitHub API.
 * 
 * Extracts:
 * - name
 * - bio (title-ish signals)
 * - location
 * - company
 * - social links
 * 
 * Confidence: medium-high for developers
 */

import { logger } from "@trigger.dev/sdk";
import { BaseProvider } from "../interfaces";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../../types/enrichment";
import { SOURCE_TRUST_WEIGHTS } from "@repo/types";

const GITHUB_API_BASE = "https://api.github.com";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

/**
 * GitHub user profile response
 */
interface GitHubUser {
    login: string;
    id: number;
    name: string | null;
    company: string | null;
    blog: string;
    location: string | null;
    email: string | null;
    bio: string | null;
    twitter_username: string | null;
    public_repos: number;
    followers: number;
    following: number;
    created_at: string;
    updated_at: string;
    html_url: string;
    avatar_url: string;
}

/**
 * GitHub search response
 */
interface GitHubSearchResponse {
    total_count: number;
    incomplete_results: boolean;
    items: Array<{
        login: string;
        id: number;
        html_url: string;
        score: number;
    }>;
}

/**
 * Fetch a GitHub user profile by username
 */
async function fetchGitHubUser(username: string): Promise<GitHubUser | null> {
    const headers: Record<string, string> = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Glaze-Enrichment/1.0",
    };

    if (GITHUB_TOKEN) {
        headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
    }

    try {
        const response = await fetch(`${GITHUB_API_BASE}/users/${encodeURIComponent(username)}`, {
            headers,
        });

        if (!response.ok) {
            if (response.status === 404) {
                logger.debug("📦 GitHubProvider: User not found", { username });
                return null;
            }
            logger.error("❌ GitHubProvider: API error", {
                status: response.status,
                statusText: response.statusText,
            });
            return null;
        }

        return await response.json() as GitHubUser;
    } catch (error) {
        logger.error("❌ GitHubProvider: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Search for a GitHub user by name/email
 */
async function searchGitHubUsers(query: string): Promise<GitHubSearchResponse | null> {
    const headers: Record<string, string> = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Glaze-Enrichment/1.0",
    };

    if (GITHUB_TOKEN) {
        headers["Authorization"] = `Bearer ${GITHUB_TOKEN}`;
    }

    try {
        const response = await fetch(
            `${GITHUB_API_BASE}/search/users?q=${encodeURIComponent(query)}&per_page=5`,
            { headers }
        );

        if (!response.ok) {
            logger.error("❌ GitHubProvider: Search API error", {
                status: response.status,
                statusText: response.statusText,
            });
            return null;
        }

        return await response.json() as GitHubSearchResponse;
    } catch (error) {
        logger.error("❌ GitHubProvider: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Extract GitHub username from URL
 */
function extractGitHubUsername(url: string): string | null {
    const match = url.match(/github\.com\/([a-zA-Z0-9\-_]+)/i);
    return match?.[1] ?? null;
}

/**
 * Clean company name from GitHub (often has @ prefix)
 */
function cleanCompanyName(company: string | null): string | null {
    if (!company) return null;
    return company.replace(/^@/, "").trim() || null;
}

/**
 * GitHub Profile Provider
 */
export class GitHubProvider extends BaseProvider {
    name = "github";
    tier = "free" as const;
    costCents = 0; // GitHub API is free (with rate limits)

    protected supportedFields: EnrichmentFieldKey[] = [
        "name",
        "shortBio",
        "company",
        "location",
        "socialLinks",
    ];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        logger.info("🐙 GitHubProvider: Starting enrichment", {
            rowId: input.rowId,
            field,
            hasName: !!input.name,
            hasEmail: !!input.email,
        });

        let user: GitHubUser | null = null;

        // Try to find GitHub profile
        // 1. Check if we have a GitHub URL in socialLinks
        const raw = input.raw as Record<string, unknown>;
        const existingLinks = raw?.socialLinks as string[] | undefined;
        if (existingLinks) {
            for (const link of existingLinks) {
                if (link.includes("github.com/")) {
                    const username = extractGitHubUsername(link);
                    if (username) {
                        user = await fetchGitHubUser(username);
                        if (user) break;
                    }
                }
            }
        }

        // 2. Search by email
        if (!user && input.email) {
            const searchResult = await searchGitHubUsers(input.email);
            if (searchResult && searchResult.items.length > 0) {
                const topResult = searchResult.items[0];
                if (topResult && topResult.score > 10) {
                    user = await fetchGitHubUser(topResult.login);
                }
            }
        }

        // 3. Search by name + company
        if (!user && input.name) {
            let query = `fullname:"${input.name}"`;
            if (input.company) {
                query += ` "${input.company}"`;
            }
            const searchResult = await searchGitHubUsers(query);
            if (searchResult && searchResult.items.length === 1) {
                // Only use if we get exactly one result (high confidence)
                user = await fetchGitHubUser(searchResult.items[0]!.login);
            }
        }

        if (!user) {
            logger.debug("📦 GitHubProvider: No GitHub profile found", { rowId: input.rowId });
            return null;
        }

        // Extract requested field
        let value: string | string[] | null = null;
        let confidence = SOURCE_TRUST_WEIGHTS.github_api ?? 0.9;

        switch (field) {
            case "name":
                value = user.name;
                confidence = user.name ? 0.85 : 0;
                break;

            case "shortBio":
                value = user.bio;
                confidence = user.bio ? 0.8 : 0;
                break;

            case "company":
                value = cleanCompanyName(user.company);
                confidence = value ? 0.75 : 0;
                break;

            case "location":
                value = user.location;
                confidence = user.location ? 0.85 : 0;
                break;

            case "socialLinks":
                const links: string[] = [user.html_url];
                if (user.blog) {
                    links.push(user.blog);
                }
                if (user.twitter_username) {
                    links.push(`https://twitter.com/${user.twitter_username}`);
                }
                value = links;
                confidence = 0.9;
                break;
        }

        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }

        logger.info("✅ GitHubProvider: Found data", {
            rowId: input.rowId,
            field,
            username: user.login,
            confidence,
        });

        return this.createResult(field, value, confidence, {
            username: user.login,
            githubId: user.id,
            publicRepos: user.public_repos,
            followers: user.followers,
        });
    }
}

// Export singleton instance
export const githubProvider = new GitHubProvider();
