/**
 * Tool Registry
 *
 * Static registry of all enrichment tools.
 * Maps tools to strategies, entity types, and required inputs.
 */

import type { ProviderTier, NormalizedInput } from "../types/enrichment";
import type { EntityType, EnrichmentStrategy } from "./types";

// Import actual tool implementations
import { resolveCompanyIdentityFromName } from "../tools/company/resolve-company-identity-from-name";
import { resolveCompanyIdentityFromDomain } from "../tools/company/resolve-company-identity-from-domain";
import { fetchCompanyProfile } from "../tools/company/fetch-company-profile";
import { fetchCompanySocials } from "../tools/company/fetch-company-socials";
import { estimateCompanySize } from "../tools/company/estimate-company-size";
import { resolvePersonFromLinkedIn } from "../tools/person/resolve-person-from-linkedin";
import { findLinkedInProfile } from "../tools/person/find-linkedin-profile";
import { resolvePersonFromNameCompany } from "../tools/person/resolve-person-from-name-company";
import { guessWorkEmail } from "../tools/person/guess-work-email";
import { fetchPersonPublicProfile } from "../tools/person/fetch-person-public-profile";

// ============================================================
// TOOL DEFINITION
// ============================================================

/**
 * Tool execution result
 */
export interface ToolExecutionResult {
    [key: string]: unknown;
}

/**
 * Tool execute function signature
 */
export type ToolExecuteFunction = (
    input: NormalizedInput,
    existingData: Record<string, unknown>
) => Promise<ToolExecutionResult>;

/**
 * Tool definition in the registry.
 */
export interface ToolDefinition {
    /** Unique tool identifier */
    id: string;

    /** Human-readable name */
    name: string;

    /** Compatible enrichment strategies */
    strategies: EnrichmentStrategy[];

    /** Compatible entity types */
    entityTypes: EntityType[];

    /** Required input fields */
    requiredInputs: string[];

    /** Optional input fields that improve results */
    optionalInputs: string[];

    /** Output fields this tool can provide */
    outputs: string[];

    /** Cost in cents */
    costCents: number;

    /** Provider tier */
    tier: ProviderTier;

    /** Tool priority (lower = run first) */
    priority: number;

    /** Can this tool fail gracefully? */
    canFail: boolean;

    /** Fallback tool ID if this fails */
    fallbackTool?: string;

    /** Execute function - actually runs the tool */
    execute?: ToolExecuteFunction;
}

// ============================================================
// TOOL EXECUTORS
// ============================================================

/**
 * Execute resolve_company_from_name tool
 */
async function executeResolveCompanyFromName(
    input: NormalizedInput,
    _existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const companyName = input.company;
    if (!companyName) {
        return {};
    }

    const result = await resolveCompanyIdentityFromName(companyName);

    if (!result.domain && !result.websiteUrl) {
        return {};
    }

    return {
        company: result.canonicalCompanyName || companyName,
        domain: result.domain,
        website: result.websiteUrl,
    };
}

/**
 * Execute resolve_company_from_domain tool
 */
async function executeResolveCompanyFromDomain(
    input: NormalizedInput,
    _existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const domain = input.domain;
    if (!domain || domain === '-') {
        return {};
    }

    const result = await resolveCompanyIdentityFromDomain(domain);

    if (result.status !== 'valid') {
        return {};
    }

    return {
        company: result.companyName,
        domain: result.canonicalDomain,
        website: result.websiteUrl,
    };
}

/**
 * Execute fetch_company_profile tool
 * 
 * This tool produces: industry, description (companySummary), founded, location
 */
async function executeFetchCompanyProfile(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    // Get domain from input or existing data
    const domain = input.domain || (existingData.website as string) || (existingData.domain as string);
    if (!domain || domain === '-') {
        return {};
    }

    // Normalize domain to URL format if needed
    let websiteUrl = domain;
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
        websiteUrl = `https://${domain}`;
    }

    const result = await fetchCompanyProfile(websiteUrl);

    // Map the result to standard output fields
    const output: ToolExecutionResult = {};

    if (result.industry) {
        output.industry = result.industry;
    }
    if (result.description) {
        output.companySummary = result.description;
    }
    if (result.founded) {
        output.founded = result.founded;
        output.foundedDate = result.founded;
    }
    if (result.location) {
        output.location = result.location;
    }

    // Add metadata
    output._confidence = result.confidence;
    output._tier = result.tier;
    output._reason = result.reason;

    return output;
}

/**
 * Execute fetch_company_socials tool
 * 
 * This tool produces: socialLinks, twitter, linkedin, github
 * It does deterministic extraction from company website - NO GUESSING
 */
async function executeFetchCompanySocials(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    // Get domain/website from input or existing data
    const website = (existingData.website as string) || input.domain;
    const companyName = input.company || (existingData.company_name as string);

    if (!website || website === '-') {
        return {};
    }

    const result = await fetchCompanySocials(website, companyName);

    // Map the result to standard output fields
    const output: ToolExecutionResult = {};
    const socialLinks: string[] = [];

    if (result.socials.twitter) {
        output.twitter = result.socials.twitter.url;
        socialLinks.push(result.socials.twitter.url);
    }
    if (result.socials.linkedin) {
        output.linkedin = result.socials.linkedin.url;
        socialLinks.push(result.socials.linkedin.url);
    }
    if (result.socials.github) {
        output.github = result.socials.github.url;
        socialLinks.push(result.socials.github.url);
    }
    if (result.socials.facebook) {
        output.facebook = result.socials.facebook.url;
        socialLinks.push(result.socials.facebook.url);
    }
    if (result.socials.instagram) {
        output.instagram = result.socials.instagram.url;
        socialLinks.push(result.socials.instagram.url);
    }

    // Combined socialLinks array
    if (socialLinks.length > 0) {
        output.socialLinks = socialLinks;
    }

    // Add metadata
    output._pagesChecked = result.pagesChecked;
    output._linksFound = result.linksFound;
    output._linksValidated = result.linksValidated;

    return output;
}

/**
 * Execute estimate_company_size tool
 * 
 * This tool produces: companySize, employeeCountRange, hiringStatus
 * Uses LinkedIn as primary source with Serper for resolution
 */
async function executeEstimateCompanySize(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    // Get domain from input or existing data
    const domain = input.domain || (existingData.website as string) || (existingData.domain as string);
    const companyName = input.company || (existingData.company_name as string);

    if (!domain || domain === '-') {
        return {};
    }

    const result = await estimateCompanySize(domain, companyName);

    // Map the result to standard output fields
    const output: ToolExecutionResult = {};

    if (result.employeeCountRange !== "unknown") {
        output.employeeCountRange = result.employeeCountRange;
        output.companySize = result.employeeCountRange; // Alias
    }
    if (result.hiringStatus !== "unknown") {
        output.hiringStatus = result.hiringStatus;
    }
    if (result.linkedinCompanyUrl) {
        output.linkedinCompanyUrl = result.linkedinCompanyUrl;
    }
    if (result.companyName) {
        output.companyNameFromLinkedIn = result.companyName;
    }
    if (result.industry) {
        output.industryFromLinkedIn = result.industry;
    }
    if (result.location) {
        output.locationFromLinkedIn = result.location;
    }

    // Add metadata
    output._confidence = result.confidence;
    output._source = result.source;
    output._reason = result.reason;

    return output;
}

// ============================================================
// PERSON TOOL EXECUTORS
// ============================================================

/**
 * Execute resolve_person_from_linkedin tool
 * 
 * This tool produces: name, title, company, location, linkedinUrl
 * Uses snippet-first strategy - never scrapes LinkedIn directly
 */
async function executeResolvePersonFromLinkedIn(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    // Get inputs from normalized input or existing data
    const linkedinUrl = input.linkedinUrl || (existingData.linkedin as string) || (existingData.linkedin_url as string);
    const name = input.name || (existingData.name as string) || (existingData.full_name as string);
    const company = input.company || (existingData.company as string) || (existingData.company_name as string);

    // Need at least linkedinUrl OR name to proceed
    if (!linkedinUrl && !name) {
        return {};
    }

    const result = await resolvePersonFromLinkedIn({
        linkedinUrl,
        name,
        company,
    });

    // Map the result to standard output fields
    const output: ToolExecutionResult = {};

    if (result.name) {
        output.name = result.name;
    }
    if (result.title) {
        output.title = result.title;
    }
    if (result.company) {
        output.company = result.company;
    }
    if (result.location) {
        output.location = result.location;
    }
    if (result.linkedinUrl) {
        output.linkedinUrl = result.linkedinUrl;
    }

    // Add metadata
    output._confidence = result.confidence;
    output._source = result.source;
    output._fieldsFromSnippets = result.fieldsFromSnippets;
    output._fieldsFromScrape = result.fieldsFromScrape;

    return output;
}

/**
 * Execute find_linkedin_profile tool
 * 
 * This tool produces: linkedinUrl
 * Pure identity resolution - finds the LinkedIn profile for name + company
 */
async function executeFindLinkedInProfile(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const name = input.name || (existingData.name as string) || (existingData.full_name as string);
    const company = input.company || (existingData.company as string) || (existingData.company_name as string);

    if (!name || !company) {
        return {};
    }

    const result = await findLinkedInProfile(name, company);

    const output: ToolExecutionResult = {};

    if (result.linkedinUrl) {
        output.linkedinUrl = result.linkedinUrl;
    }

    // Add metadata
    output._confidence = result.confidence;
    output._candidatesFound = result.candidatesFound;
    output._matchReason = result.matchReason;

    return output;
}

/**
 * Execute resolve_person_from_name_company tool
 * 
 * This tool produces: name, title, company, location, linkedinUrl
 * Main person resolution pipeline: FindLinkedIn → ResolveFromLinkedIn
 */
async function executeResolvePersonFromNameCompany(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const name = input.name || (existingData.name as string) || (existingData.full_name as string);
    const company = input.company || (existingData.company as string) || (existingData.company_name as string);

    if (!name) {
        return {};
    }

    const result = await resolvePersonFromNameCompany(name, company || '');

    const output: ToolExecutionResult = {};

    if (result.name) output.name = result.name;
    if (result.title) output.title = result.title;
    if (result.company) output.company = result.company;
    if (result.location) output.location = result.location;
    if (result.linkedinUrl) output.linkedinUrl = result.linkedinUrl;

    // Add metadata
    output._confidence = result.confidence;
    output._source = result.source;
    output._linkedinAnchored = result.linkedinAnchored;
    output._resolutionStatus = result.resolutionStatus;

    return output;
}

/**
 * Execute guess_work_email tool
 * 
 * This tool produces: email
 * Uses Hunter → Prospeo waterfall strategy
 */
async function executeGuessWorkEmail(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const name = input.name || (existingData.name as string) || (existingData.full_name as string);
    const domain = input.domain || (existingData.domain as string) || (existingData.company_domain as string);
    const company = input.company || (existingData.company as string);

    if (!name || !domain) {
        return {};
    }

    // Use company domain if provided, otherwise use domain
    const companyDomain = domain;

    const result = await guessWorkEmail(name, companyDomain);

    const output: ToolExecutionResult = {};

    if (result.email) {
        output.email = result.email;
    }

    // Add metadata
    output._confidence = result.confidence;
    output._source = result.source;
    output._verificationStatus = result.verificationStatus;
    output._hunterScore = result.hunterScore;
    output._reason = result.reason;

    return output;
}

/**
 * Execute fetch_person_public_profile tool
 * 
 * This tool produces: bio, twitter, github, personalWebsite
 * Decorates an already resolved person with bio and social links
 */
async function executeFetchPersonPublicProfile(
    input: NormalizedInput,
    existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
    const name = input.name || (existingData.name as string) || (existingData.full_name as string);
    const company = input.company || (existingData.company as string) || (existingData.company_name as string);
    const linkedinUrl = input.linkedinUrl || (existingData.linkedin as string) || (existingData.linkedin_url as string);

    if (!name || !company) {
        return {};
    }

    const result = await fetchPersonPublicProfile(name, company, linkedinUrl);

    const output: ToolExecutionResult = {};

    if (result.bio) {
        output.bio = result.bio;
    }
    if (result.socialLinks.twitter) {
        output.twitter = result.socialLinks.twitter;
    }
    if (result.socialLinks.github) {
        output.github = result.socialLinks.github;
    }
    if (result.socialLinks.personalWebsite) {
        output.personalWebsite = result.socialLinks.personalWebsite;
    }

    // Add metadata
    output._source = result.source;
    if (result.scrapedUrl) {
        output._scrapedUrl = result.scrapedUrl;
    }

    return output;
}

// ============================================================
// COMPANY TOOLS
// ============================================================

const COMPANY_TOOLS: ToolDefinition[] = [
    {
        id: "resolve_company_from_domain",
        name: "Resolve Company From Domain",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: [],
        outputs: ["company", "domain", "website"],
        costCents: 0,
        tier: "free",
        priority: 1,
        canFail: true,
        execute: executeResolveCompanyFromDomain,
    },
    {
        id: "resolve_company_from_name",
        name: "Resolve Company From Name",
        strategies: ["HYPOTHESIS_AND_SCORE", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["company"],
        optionalInputs: ["industry"],
        outputs: ["company", "domain", "website"],
        costCents: 2,
        tier: "cheap",
        priority: 2,
        canFail: true,
        fallbackTool: "serper_company_search",
        execute: executeResolveCompanyFromName,
    },
    {
        id: "fetch_company_profile",
        name: "Fetch Company Profile",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: ["website"],
        outputs: ["companySummary", "industry", "founded", "location"],
        costCents: 1,
        tier: "cheap",
        priority: 3,
        canFail: true,
        execute: executeFetchCompanyProfile,
    },
    {
        id: "fetch_company_socials",
        name: "Fetch Company Socials",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: ["company", "website"],
        outputs: ["socialLinks", "twitter", "linkedin", "github"],
        costCents: 0,
        tier: "free",
        priority: 4,
        canFail: true,
        execute: executeFetchCompanySocials,
    },
    {
        id: "estimate_company_size",
        name: "Estimate Company Size",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: ["company"],
        outputs: ["companySize", "employeeCountRange", "hiringStatus"],
        costCents: 2,
        tier: "cheap",
        priority: 5,
        canFail: true,
        execute: executeEstimateCompanySize,
    },
    {
        id: "detect_tech_stack",
        name: "Detect Tech Stack",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: [],
        outputs: ["techStack"],
        costCents: 0,
        tier: "free",
        priority: 5,
        canFail: true,
    },
    {
        id: "serper_company_search",
        name: "Serper Company Search",
        strategies: ["SEARCH_AND_VALIDATE", "HYPOTHESIS_AND_SCORE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["company"],
        optionalInputs: ["industry"],
        outputs: ["domain", "website", "companySummary"],
        costCents: 1,
        tier: "cheap",
        priority: 2,
        canFail: true,
    },
    {
        id: "company_summarizer",
        name: "Company Summarizer",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: ["company"],
        outputs: ["companySummary"],
        costCents: 0,
        tier: "cheap",
        priority: 6,
        canFail: true,
    },
];

// ============================================================
// PERSON TOOLS
// ============================================================

const PERSON_TOOLS: ToolDefinition[] = [
    {
        id: "resolve_person_from_linkedin",
        name: "Resolve Person From LinkedIn",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: [],  // Can work with just name+company OR linkedinUrl
        optionalInputs: ["linkedinUrl", "name", "company"],
        outputs: ["name", "title", "company", "location", "linkedinUrl"],
        costCents: 2,
        tier: "cheap",
        priority: 1,
        canFail: true,
        execute: executeResolvePersonFromLinkedIn,
    },
    {
        id: "find_linkedin_profile",
        name: "Find LinkedIn Profile",
        strategies: ["HYPOTHESIS_AND_SCORE", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name", "company"],
        optionalInputs: [],
        outputs: ["linkedinUrl"],
        costCents: 1,
        tier: "cheap",
        priority: 1,  // Run first - identity anchor
        canFail: true,
        execute: executeFindLinkedInProfile,
    },
    {
        id: "resolve_person_from_name_company",
        name: "Resolve Person From Name + Company",
        strategies: ["HYPOTHESIS_AND_SCORE", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name"],
        optionalInputs: ["company", "domain"],
        outputs: ["linkedinUrl", "title", "name", "company", "location"],
        costCents: 3,
        tier: "cheap",
        priority: 2,
        canFail: true,
        execute: executeResolvePersonFromNameCompany,
    },
    {
        id: "serper_person_search",
        name: "Serper Person Search",
        strategies: ["SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name"],
        optionalInputs: ["company", "domain"],
        outputs: ["linkedinUrl", "shortBio"],
        costCents: 1,
        tier: "cheap",
        priority: 2,
        canFail: true,
    },
    {
        id: "guess_work_email",
        name: "Guess Work Email",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name", "domain"],
        optionalInputs: ["company"],
        outputs: ["email"],
        costCents: 1,
        tier: "cheap",
        priority: 3,
        canFail: true,
        execute: executeGuessWorkEmail,
    },
    {
        id: "fetch_person_public_profile",
        name: "Fetch Person Public Profile",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name", "company"],
        optionalInputs: ["linkedinUrl"],
        outputs: ["bio", "twitter", "github", "personalWebsite"],
        costCents: 2,
        tier: "cheap",
        priority: 4,
        canFail: true,
        execute: executeFetchPersonPublicProfile,
    },
    {
        id: "email_pattern_inference",
        name: "Email Pattern Inference",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name", "domain"],
        optionalInputs: ["company"],
        outputs: ["emailCandidates"],
        costCents: 0,
        tier: "free",
        priority: 5,
        canFail: true,
    },
    {
        id: "email_verifier",
        name: "Email Verifier",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["PERSON"],
        requiredInputs: ["emailCandidates"],
        optionalInputs: [],
        outputs: ["email"],
        costCents: 1,
        tier: "cheap",
        priority: 5,
        canFail: true,
    },
    {
        id: "github_profile",
        name: "GitHub Profile",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name"],
        optionalInputs: ["company", "email"],
        outputs: ["socialLinks", "shortBio"],
        costCents: 0,
        tier: "free",
        priority: 6,
        canFail: true,
    },
    {
        id: "bio_synthesizer",
        name: "Bio Synthesizer",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name"],
        optionalInputs: ["title", "company", "linkedinUrl"],
        outputs: ["shortBio"],
        costCents: 0,
        tier: "cheap",
        priority: 7,
        canFail: true,
    },
];

// ============================================================
// REGISTRY
// ============================================================

/**
 * All tools in the registry.
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
    ...COMPANY_TOOLS,
    ...PERSON_TOOLS,
];

/**
 * Get tool by ID.
 */
export function getToolById(id: string): ToolDefinition | undefined {
    return TOOL_REGISTRY.find(t => t.id === id);
}

/**
 * Get tools for an entity type.
 */
export function getToolsForEntityType(entityType: EntityType): ToolDefinition[] {
    return TOOL_REGISTRY.filter(t => t.entityTypes.includes(entityType));
}

/**
 * Get tools for a strategy.
 */
export function getToolsForStrategy(strategy: EnrichmentStrategy): ToolDefinition[] {
    return TOOL_REGISTRY.filter(t => t.strategies.includes(strategy));
}

/**
 * Get tools that match both entity type and strategy.
 */
export function getMatchingTools(
    entityType: EntityType,
    strategy: EnrichmentStrategy
): ToolDefinition[] {
    return TOOL_REGISTRY.filter(
        t => t.entityTypes.includes(entityType) && t.strategies.includes(strategy)
    ).sort((a, b) => a.priority - b.priority);
}

/**
 * Get tools that can provide a specific output field.
 */
export function getToolsForOutput(field: string): ToolDefinition[] {
    return TOOL_REGISTRY.filter(t => t.outputs.includes(field));
}

/**
 * Check if tool requirements are satisfied by available inputs.
 */
export function canRunTool(
    tool: ToolDefinition,
    availableInputs: string[]
): { canRun: boolean; missing: string[] } {
    const available = new Set(availableInputs);
    const missing = tool.requiredInputs.filter(input => !available.has(input));
    return { canRun: missing.length === 0, missing };
}

/**
 * Calculate total cost for a set of tools.
 */
export function calculateTotalCost(toolIds: string[]): number {
    return toolIds.reduce((sum, id) => {
        const tool = getToolById(id);
        return sum + (tool?.costCents ?? 0);
    }, 0);
}
