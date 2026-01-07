/**
 * LinkedIn Parser Provider
 * 
 * Phase 2 deterministic enrichment tool.
 * Parses LinkedIn profiles using RapidAPI LinkedIn Data API.
 * 
 * Extracts:
 * - name
 * - title
 * - company
 * - location
 * - socialLinks
 * 
 * Confidence: 0.9 (high trust for verified LinkedIn data)
 */

import { logger } from "@trigger.dev/sdk";
import { BaseProvider } from "../interfaces";
import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from "../../types/enrichment";
import { SOURCE_TRUST_WEIGHTS } from "@glaze/types/field-value";

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.RAPIDAPI_LINKEDIN_HOST || "linkedin-data-api.p.rapidapi.com";

/**
 * LinkedIn profile response from RapidAPI
 */
interface LinkedInProfile {
    id?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    headline?: string;
    summary?: string;
    profilePicture?: string;
    backgroundImage?: string;
    industryName?: string;
    geo?: {
        country?: string;
        city?: string;
        full?: string;
    };
    educations?: Array<{
        schoolName?: string;
        degree?: string;
        fieldOfStudy?: string;
        startYear?: number;
        endYear?: number;
    }>;
    experiences?: Array<{
        title?: string;
        companyName?: string;
        locationName?: string;
        startDate?: { year: number; month: number };
        endDate?: { year: number; month: number } | null;
        description?: string;
    }>;
    skills?: Array<{
        name: string;
        endorsementsCount?: number;
    }>;
}

/**
 * LinkedIn company response from RapidAPI
 */
interface LinkedInCompany {
    id?: string;
    name?: string;
    universalName?: string;
    description?: string;
    website?: string;
    industry?: string;
    companySize?: {
        start: number;
        end: number;
    };
    staffCount?: number;
    headquarters?: {
        city?: string;
        country?: string;
        geographicArea?: string;
        postalCode?: string;
        line1?: string;
    };
    foundedOn?: { year: number };
    specialities?: string[];
    logo?: string;
}

/**
 * Extract LinkedIn username from URL
 */
function extractLinkedInUsername(url: string): { type: 'person' | 'company'; username: string } | null {
    const personMatch = url.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i);
    if (personMatch?.[1]) {
        return { type: 'person', username: personMatch[1] };
    }

    const companyMatch = url.match(/linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/i);
    if (companyMatch?.[1]) {
        return { type: 'company', username: companyMatch[1] };
    }

    return null;
}

/**
 * Fetch LinkedIn person profile
 */
async function fetchLinkedInProfile(username: string): Promise<LinkedInProfile | null> {
    if (!RAPIDAPI_KEY) {
        logger.warn("⚠️ LinkedInProvider: No RapidAPI key configured");
        return null;
    }

    try {
        const response = await fetch(
            `https://${RAPIDAPI_HOST}/get-profile-data-by-url?url=${encodeURIComponent(`https://linkedin.com/in/${username}`)}`,
            {
                method: "GET",
                headers: {
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": RAPIDAPI_HOST,
                },
            }
        );

        if (!response.ok) {
            logger.error("❌ LinkedInProvider: Profile API error", {
                status: response.status,
                statusText: response.statusText,
            });
            return null;
        }

        return await response.json() as LinkedInProfile;
    } catch (error) {
        logger.error("❌ LinkedInProvider: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Fetch LinkedIn company profile
 */
async function fetchLinkedInCompany(username: string): Promise<LinkedInCompany | null> {
    if (!RAPIDAPI_KEY) {
        logger.warn("⚠️ LinkedInProvider: No RapidAPI key configured");
        return null;
    }

    try {
        const response = await fetch(
            `https://${RAPIDAPI_HOST}/get-company-details?username=${encodeURIComponent(username)}`,
            {
                method: "GET",
                headers: {
                    "X-RapidAPI-Key": RAPIDAPI_KEY,
                    "X-RapidAPI-Host": RAPIDAPI_HOST,
                },
            }
        );

        if (!response.ok) {
            logger.error("❌ LinkedInProvider: Company API error", {
                status: response.status,
                statusText: response.statusText,
            });
            return null;
        }

        return await response.json() as LinkedInCompany;
    } catch (error) {
        logger.error("❌ LinkedInProvider: Network error", {
            error: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
    }
}

/**
 * Get current position from experiences
 */
function getCurrentPosition(experiences?: LinkedInProfile['experiences']): { title?: string; company?: string } {
    if (!experiences || experiences.length === 0) {
        return {};
    }

    // Find position without end date (current) or most recent
    const current = experiences.find(e => e.endDate === null) || experiences[0];
    return {
        title: current?.title,
        company: current?.companyName,
    };
}

/**
 * Format company size range
 */
function formatCompanySize(size?: LinkedInCompany['companySize'], staffCount?: number): string | null {
    if (staffCount) {
        return `${staffCount.toLocaleString()} employees`;
    }
    if (size) {
        if (size.end > 10000) {
            return `${size.start.toLocaleString()}+ employees`;
        }
        return `${size.start.toLocaleString()}-${size.end.toLocaleString()} employees`;
    }
    return null;
}

/**
 * LinkedIn Parser Provider
 */
export class LinkedInProvider extends BaseProvider {
    name = "linkedin_api";
    tier = "premium" as const;
    costCents = 3; // ~3 cents per API call

    protected supportedFields: EnrichmentFieldKey[] = [
        "name",
        "title",
        "company",
        "shortBio",
        "location",
        "socialLinks",
        "companySize",
        "companySummary",
    ];

    async enrich(
        input: NormalizedInput,
        field: EnrichmentFieldKey
    ): Promise<ProviderResult | null> {
        if (!input.linkedinUrl) {
            logger.debug("🔗 LinkedInProvider: No LinkedIn URL provided", { rowId: input.rowId });
            return null;
        }

        const extracted = extractLinkedInUsername(input.linkedinUrl);
        if (!extracted) {
            logger.debug("🔗 LinkedInProvider: Could not extract username", {
                rowId: input.rowId,
                url: input.linkedinUrl,
            });
            return null;
        }

        logger.info("🔗 LinkedInProvider: Fetching profile", {
            rowId: input.rowId,
            type: extracted.type,
            username: extracted.username,
            field,
        });

        let value: string | string[] | number | null = null;
        let confidence = SOURCE_TRUST_WEIGHTS.linkedin_api ?? 0.95;
        let rawData: unknown;

        if (extracted.type === 'person') {
            const profile = await fetchLinkedInProfile(extracted.username);
            if (!profile) {
                return null;
            }

            rawData = profile;
            const currentPosition = getCurrentPosition(profile.experiences);

            switch (field) {
                case "name":
                    value = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || null;
                    break;

                case "title":
                    value = profile.headline || currentPosition.title || null;
                    break;

                case "company":
                    value = currentPosition.company || null;
                    confidence = 0.85; // Slightly lower as it's inferred from experience
                    break;

                case "shortBio":
                    value = profile.summary || profile.headline || null;
                    break;

                case "location":
                    value = profile.geo?.full || profile.geo?.city || null;
                    break;

                case "socialLinks":
                    value = [`https://linkedin.com/in/${extracted.username}`];
                    break;
            }
        } else {
            // Company profile
            const company = await fetchLinkedInCompany(extracted.username);
            if (!company) {
                return null;
            }

            rawData = company;

            switch (field) {
                case "company":
                    value = company.name || null;
                    break;

                case "companySummary":
                    value = company.description || null;
                    break;

                case "companySize":
                    value = formatCompanySize(company.companySize, company.staffCount);
                    break;

                case "location":
                    const hq = company.headquarters;
                    if (hq) {
                        value = [hq.city, hq.geographicArea, hq.country].filter(Boolean).join(", ") || null;
                    }
                    break;

                case "socialLinks":
                    const links: string[] = [`https://linkedin.com/company/${extracted.username}`];
                    if (company.website) {
                        links.push(company.website);
                    }
                    value = links;
                    break;

                case "foundedDate":
                    value = company.foundedOn?.year ?? null;
                    break;
            }
        }

        if (!value || (Array.isArray(value) && value.length === 0)) {
            return null;
        }

        logger.info("✅ LinkedInProvider: Found data", {
            rowId: input.rowId,
            field,
            type: extracted.type,
            confidence,
        });

        return this.createResult(field, value, confidence, rawData);
    }
}

// Export singleton instance
export const linkedInProvider = new LinkedInProvider();
