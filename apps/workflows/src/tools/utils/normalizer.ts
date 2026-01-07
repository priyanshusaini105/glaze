/**
 * Normalizer Utility
 *
 * Normalizes input data for enrichment processing.
 */

import type { NormalizedInput } from "../../types/enrichment";

/**
 * Extract domain from various input sources.
 */
export function extractDomain(data: Record<string, unknown>): string | undefined {
    if (data.domain && typeof data.domain === "string") {
        return cleanDomain(data.domain);
    }

    if (data.website && typeof data.website === "string") {
        try {
            const url = new URL(data.website);
            return cleanDomain(url.hostname);
        } catch {
            // Invalid URL, try extracting domain pattern
            const match = data.website.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
            if (match) return cleanDomain(match[1] || "");
        }
    }

    if (data.email && typeof data.email === "string") {
        const atIndex = data.email.indexOf("@");
        if (atIndex > 0) {
            return data.email.slice(atIndex + 1).toLowerCase();
        }
    }

    if (data.companyUrl && typeof data.companyUrl === "string") {
        try {
            const url = new URL(data.companyUrl);
            return cleanDomain(url.hostname);
        } catch {
            return undefined;
        }
    }

    return undefined;
}

/**
 * Clean and normalize a domain.
 */
function cleanDomain(domain: string): string {
    return domain.toLowerCase().replace(/^www\./, "").trim();
}

/**
 * Normalize a person's name.
 */
export function normalizeName(name: string | undefined): string | undefined {
    if (!name) return undefined;

    return name
        .trim()
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

/**
 * Normalize company name.
 */
export function normalizeCompanyName(company: string | undefined): string | undefined {
    if (!company) return undefined;

    // Remove common suffixes for matching, but preserve for display
    return company
        .trim()
        .replace(/\s+/g, " ")
        .replace(/^\s+|\s+$/g, "");
}

/**
 * Create a normalized input from raw data.
 */
export function normalizeInput(
    rowId: string,
    tableId: string,
    data: Record<string, unknown>
): NormalizedInput {
    return {
        rowId,
        tableId,
        name: normalizeName(data.name as string | undefined),
        domain: extractDomain(data),
        linkedinUrl: (data.linkedinUrl as string) || (data.linkedin as string) || undefined,
        email: (data.email as string) || undefined,
        company: normalizeCompanyName(
            (data.company as string) || (data.companyName as string) || undefined
        ),
        raw: data,
    };
}
