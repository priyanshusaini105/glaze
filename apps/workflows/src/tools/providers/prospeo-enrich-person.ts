/**
 * Prospeo Enrich Person Provider
 * 
 * Uses Prospeo's Enrich Person API for high-accuracy email discovery.
 * LinkedIn URL input provides the best results (~0.95 confidence).
 * 
 * API: POST https://api.prospeo.io/enrich-person
 * Docs: https://prospeo.io/api-docs/enrich-person
 */

import { logger } from "@trigger.dev/sdk";
import { prospeoKeyManager } from "./api-key-manager";

// ============================================================
// TYPES
// ============================================================

export interface PersonData {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    email?: string;
    linkedin_url?: string;
    company_name?: string;
    company_website?: string;
    company_linkedin_url?: string;
    person_id?: string;
}

export interface EnrichPersonOptions {
    only_verified_email?: boolean;
    enrich_mobile?: boolean;
    only_verified_mobile?: boolean;
}

interface EmailInfo {
    status: string;
    revealed: boolean;
    email: string;
    verification_method?: string;
    email_mx_provider?: string;
}

interface PersonInfo {
    person_id: string;
    first_name: string;
    last_name: string;
    full_name: string;
    linkedin_url: string;
    current_job_title: string;
    headline: string;
    email: EmailInfo;
    location?: {
        country: string;
        country_code: string;
        state: string;
        city: string;
        time_zone: string;
    };
}

interface CompanyInfo {
    company_id: string;
    name: string;
    website: string;
    domain: string;
    industry: string;
    employee_count: number;
    linkedin_url: string;
}

interface ProspeoEnrichResponse {
    error: boolean;
    free_enrichment?: boolean;
    error_code?: string;
    response?: {
        person: PersonInfo;
        company: CompanyInfo | null;
    };
}

export interface EnrichByLinkedInResult {
    success: boolean;
    email?: string;
    emailStatus?: string;
    personName?: string;
    currentCompany?: string;
    currentJobTitle?: string;
    linkedinUrl?: string;
    location?: string;
    error?: string;
    errorCode?: string;
    confidence: number;
}

const PROSPEO_API_URL = "https://api.prospeo.io/enrich-person";

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Enrich a person using Prospeo Enrich Person API
 * 
 * @param personData - Person data (linkedin_url, name+company, etc.)
 * @param options - Optional parameters (only_verified_email, etc.)
 * @returns Enriched person data with email
 */
async function prospeoEnrichPerson(
    personData: PersonData,
    options?: EnrichPersonOptions
): Promise<ProspeoEnrichResponse | null> {
    return prospeoKeyManager.withKey(async (apiKey) => {
        const payload = {
            data: personData,
            ...options,
        };

        logger.info("🔍 ProspeoEnrichPerson: Calling API", {
            hasLinkedIn: !!personData.linkedin_url,
            hasName: !!personData.full_name || !!(personData.first_name && personData.last_name),
            hasCompany: !!personData.company_name || !!personData.company_website,
        });

        const response = await fetch(PROSPEO_API_URL, {
            method: "POST",
            headers: {
                "X-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error(`KEY_EXHAUSTED:429:rate_limited`);
            }
            logger.warn("⚠️ ProspeoEnrichPerson: API error", {
                status: response.status,
            });
            return null;
        }

        const data: ProspeoEnrichResponse = await response.json();
        return data;
    });
}

/**
 * Enrich person using LinkedIn URL (highest accuracy method)
 * 
 * @param linkedinUrl - LinkedIn profile URL
 * @param verifiedOnly - Only return verified emails (default: true)
 * @returns Email and person info
 */
export async function enrichByLinkedIn(
    linkedinUrl: string,
    verifiedOnly: boolean = true
): Promise<EnrichByLinkedInResult> {
    logger.info("🔗 ProspeoEnrichPerson: Enriching by LinkedIn", { linkedinUrl });

    try {
        const options: EnrichPersonOptions = verifiedOnly
            ? { only_verified_email: true }
            : {};

        const result = await prospeoEnrichPerson(
            { linkedin_url: linkedinUrl },
            options
        );

        if (!result) {
            return {
                success: false,
                error: "API request failed",
                confidence: 0,
            };
        }

        if (result.error) {
            return {
                success: false,
                error: "Failed to enrich person",
                errorCode: result.error_code,
                confidence: 0,
            };
        }

        const person = result.response?.person;
        const company = result.response?.company;
        const emailInfo = person?.email;

        if (!emailInfo?.email) {
            return {
                success: false,
                error: "No email found for this person",
                personName: person?.full_name,
                linkedinUrl: person?.linkedin_url,
                confidence: 0.3, // Person found but no email
            };
        }

        // LinkedIn URL gives us high confidence since identity is resolved
        let confidence = 0.85;
        if (emailInfo.status === "valid" || emailInfo.status === "VERIFIED") {
            confidence = 0.95;
        } else if (emailInfo.status === "catch_all") {
            confidence = 0.7;
        }

        const location = person?.location
            ? `${person.location.city}, ${person.location.state}, ${person.location.country_code}`
            : undefined;

        logger.info("✅ ProspeoEnrichPerson: LinkedIn enrichment success", {
            email: emailInfo.email,
            status: emailInfo.status,
            confidence,
        });

        return {
            success: true,
            email: emailInfo.email,
            emailStatus: emailInfo.status,
            personName: person?.full_name,
            currentCompany: company?.name,
            currentJobTitle: person?.current_job_title,
            linkedinUrl: person?.linkedin_url,
            location,
            confidence,
        };
    } catch (error) {
        logger.error("❌ ProspeoEnrichPerson: LinkedIn enrichment failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            confidence: 0,
        };
    }
}

/**
 * Enrich person using name + company (fallback method)
 * 
 * @param fullName - Person's full name
 * @param companyDomain - Company website/domain
 * @param companyName - Optional company name for better accuracy
 * @param verifiedOnly - Only return verified emails (default: true)
 * @returns Email and person info
 */
export async function enrichByNameCompany(
    fullName: string,
    companyDomain: string,
    companyName?: string,
    verifiedOnly: boolean = true
): Promise<EnrichByLinkedInResult> {
    logger.info("👤 ProspeoEnrichPerson: Enriching by name+company", {
        fullName,
        companyDomain,
        companyName,
    });

    try {
        const personData: PersonData = {
            full_name: fullName,
            company_website: companyDomain,
        };

        if (companyName) {
            personData.company_name = companyName;
        }

        const options: EnrichPersonOptions = verifiedOnly
            ? { only_verified_email: true }
            : {};

        const result = await prospeoEnrichPerson(personData, options);

        if (!result) {
            return {
                success: false,
                error: "API request failed",
                confidence: 0,
            };
        }

        if (result.error) {
            return {
                success: false,
                error: "Failed to enrich person",
                errorCode: result.error_code,
                confidence: 0,
            };
        }

        const person = result.response?.person;
        const company = result.response?.company;
        const emailInfo = person?.email;

        if (!emailInfo?.email) {
            return {
                success: false,
                error: "No email found for this person",
                personName: person?.full_name,
                linkedinUrl: person?.linkedin_url,
                confidence: 0.2, // Less confident without LinkedIn
            };
        }

        // Name+company gives us lower confidence than LinkedIn
        let confidence = 0.6;
        if (emailInfo.status === "valid" || emailInfo.status === "VERIFIED") {
            confidence = 0.8;
        } else if (emailInfo.status === "catch_all") {
            confidence = 0.5;
        }

        const location = person?.location
            ? `${person.location.city}, ${person.location.state}, ${person.location.country_code}`
            : undefined;

        logger.info("✅ ProspeoEnrichPerson: Name+company enrichment success", {
            email: emailInfo.email,
            status: emailInfo.status,
            confidence,
        });

        return {
            success: true,
            email: emailInfo.email,
            emailStatus: emailInfo.status,
            personName: person?.full_name,
            currentCompany: company?.name,
            currentJobTitle: person?.current_job_title,
            linkedinUrl: person?.linkedin_url,
            location,
            confidence,
        };
    } catch (error) {
        logger.error("❌ ProspeoEnrichPerson: Name+company enrichment failed", {
            error: error instanceof Error ? error.message : "Unknown",
        });
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
            confidence: 0,
        };
    }
}

// ============================================================
// BULK ENRICHMENT (up to 50 records at once)
// ============================================================

const PROSPEO_BULK_API_URL = "https://api.prospeo.io/bulk-enrich-person";
const MAX_BULK_BATCH_SIZE = 50;

/**
 * Input for bulk enrichment
 */
export interface BulkEnrichInput {
    identifier: string;  // Unique ID to match results
    linkedin_url?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    company_name?: string;
    company_website?: string;
    company_linkedin_url?: string;
    person_id?: string;
}

/**
 * Single result from bulk enrichment
 */
export interface BulkEnrichResult {
    identifier: string;
    success: boolean;
    email?: string;
    emailStatus?: string;
    personName?: string;
    currentCompany?: string;
    currentJobTitle?: string;
    linkedinUrl?: string;
    location?: string;
    error?: string;
    confidence: number;
}

/**
 * Response from bulk API
 */
interface ProspecoBulkEnrichResponse {
    error: boolean;
    error_code?: string;
    total_cost?: number;
    matched?: Array<{
        identifier: string;
        person: PersonInfo;
        company: CompanyInfo | null;
    }>;
    not_matched?: string[];
    invalid_datapoints?: string[];
}

/**
 * Bulk enrich persons using Prospeo Bulk Enrich Person API
 * 
 * @param records - Array of person records to enrich (max 50)
 * @param verifiedOnly - Only return verified emails (default: true)
 * @returns Array of results matched by identifier
 */
export async function bulkEnrichPersons(
    records: BulkEnrichInput[],
    verifiedOnly: boolean = true
): Promise<BulkEnrichResult[]> {
    if (records.length === 0) {
        return [];
    }

    logger.info("📦 ProspeoEnrichPerson: Starting bulk enrichment", {
        totalRecords: records.length,
        batches: Math.ceil(records.length / MAX_BULK_BATCH_SIZE),
    });

    // Process in batches of 50
    const allResults: BulkEnrichResult[] = [];
    const batches: BulkEnrichInput[][] = [];

    for (let i = 0; i < records.length; i += MAX_BULK_BATCH_SIZE) {
        batches.push(records.slice(i, i + MAX_BULK_BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]!;

        logger.info(`📦 ProspeoEnrichPerson: Processing batch ${batchIndex + 1}/${batches.length}`, {
            batchSize: batch.length,
        });

        try {
            const batchResults = await processBulkBatch(batch, verifiedOnly);
            allResults.push(...batchResults);
        } catch (error) {
            logger.error(`❌ ProspeoEnrichPerson: Batch ${batchIndex + 1} failed`, {
                error: error instanceof Error ? error.message : "Unknown",
            });

            // Mark all records in failed batch as errors
            for (const record of batch) {
                allResults.push({
                    identifier: record.identifier,
                    success: false,
                    error: error instanceof Error ? error.message : "Batch failed",
                    confidence: 0,
                });
            }
        }

        // Small delay between batches to be respectful
        if (batchIndex < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }

    logger.info("✅ ProspeoEnrichPerson: Bulk enrichment complete", {
        total: allResults.length,
        successful: allResults.filter(r => r.success).length,
        failed: allResults.filter(r => !r.success).length,
    });

    return allResults;
}

/**
 * Process a single batch of records (max 50)
 */
async function processBulkBatch(
    batch: BulkEnrichInput[],
    verifiedOnly: boolean
): Promise<BulkEnrichResult[]> {
    const result = await prospeoKeyManager.withKey(async (apiKey) => {
        const payload = {
            only_verified_email: verifiedOnly,
            data: batch,
        };

        const response = await fetch(PROSPEO_BULK_API_URL, {
            method: "POST",
            headers: {
                "X-KEY": apiKey,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        });

        // Check rate limit headers for logging
        const dailyLeft = response.headers.get("x-daily-request-left");
        const minuteLeft = response.headers.get("x-minute-request-left");
        if (dailyLeft || minuteLeft) {
            logger.info("📊 ProspeoEnrichPerson: Rate limit status", {
                dailyLeft,
                minuteLeft,
            });
        }

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error(`KEY_EXHAUSTED:429:rate_limited`);
            }
            throw new Error(`API error: ${response.status}`);
        }

        const data: ProspecoBulkEnrichResponse = await response.json();
        return data;
    });

    if (!result) {
        throw new Error("All API keys exhausted");
    }

    if (result.error) {
        throw new Error(result.error_code || "Bulk enrichment failed");
    }

    // Build results map
    const results: BulkEnrichResult[] = [];

    // Process matched records
    if (result.matched) {
        for (const match of result.matched) {
            const person = match.person;
            const company = match.company;
            const emailInfo = person?.email;

            let confidence = 0.6;
            if (emailInfo?.status === "valid" || emailInfo?.status === "VERIFIED") {
                confidence = 0.9;
            } else if (emailInfo?.status === "catch_all") {
                confidence = 0.6;
            }

            const location = person?.location
                ? `${person.location.city}, ${person.location.state}, ${person.location.country_code}`
                : undefined;

            results.push({
                identifier: match.identifier,
                success: !!emailInfo?.email,
                email: emailInfo?.email,
                emailStatus: emailInfo?.status,
                personName: person?.full_name,
                currentCompany: company?.name,
                currentJobTitle: person?.current_job_title,
                linkedinUrl: person?.linkedin_url,
                location,
                confidence: emailInfo?.email ? confidence : 0.2,
            });
        }
    }

    // Process not_matched records
    if (result.not_matched) {
        for (const identifier of result.not_matched) {
            results.push({
                identifier,
                success: false,
                error: "No match found",
                confidence: 0,
            });
        }
    }

    // Process invalid_datapoints records
    if (result.invalid_datapoints) {
        for (const identifier of result.invalid_datapoints) {
            results.push({
                identifier,
                success: false,
                error: "Invalid datapoints - missing required fields",
                confidence: 0,
            });
        }
    }

    return results;
}

/**
 * Helper: Find LinkedIn URLs for multiple persons before bulk enrichment
 * This improves accuracy by resolving identity first
 */
export async function prepareBulkEnrichWithLinkedIn(
    persons: Array<{
        identifier: string;
        name: string;
        company?: string;
        domain?: string;
        linkedinUrl?: string;
    }>,
    findLinkedInProfileFn: (name: string, company: string) => Promise<{ linkedinUrl: string | null; confidence: number }>
): Promise<BulkEnrichInput[]> {
    const inputs: BulkEnrichInput[] = [];

    for (const person of persons) {
        const input: BulkEnrichInput = {
            identifier: person.identifier,
            full_name: person.name,
        };

        // Use provided LinkedIn URL if available
        if (person.linkedinUrl) {
            input.linkedin_url = person.linkedinUrl;
        } else if (person.name && person.company) {
            // Try to find LinkedIn URL for better accuracy
            try {
                const result = await findLinkedInProfileFn(person.name, person.company);
                if (result.linkedinUrl && result.confidence >= 0.5) {
                    input.linkedin_url = result.linkedinUrl;
                }
            } catch {
                // Continue without LinkedIn URL
            }
        }

        // Add company info as fallback
        if (person.domain) {
            input.company_website = person.domain;
        }
        if (person.company) {
            input.company_name = person.company;
        }

        inputs.push(input);
    }

    return inputs;
}

