/**
 * Identity Resolver Tool
 * 
 * Phase 1 tool that determines entity type and extracts canonical identifiers.
 * This runs BEFORE any enrichment to prevent garbage downstream.
 * 
 * Responsibilities:
 * - Determine if this is a person-centric or company-centric row
 * - Extract and normalize canonical identifiers
 * - Provide confidence score for the identity resolution
 */

import { logger } from "@trigger.dev/sdk";
import type { NormalizedInput, EnrichmentFieldKey } from "../types/enrichment";
import { normalizeDomain, extractDomainFromEmail, extractDomainFromUrl } from "./domain-normalizer";
import type { EntityIdentity } from "@glaze/types/field-value";

/**
 * Signals that indicate a person-centric row
 */
const PERSON_SIGNALS: (keyof NormalizedInput)[] = ['name', 'linkedinUrl', 'email'];

/**
 * Signals that indicate a company-centric row
 */
const COMPANY_SIGNALS: (keyof NormalizedInput)[] = ['domain', 'company'];

/**
 * LinkedIn URL patterns
 */
const LINKEDIN_PERSON_PATTERN = /linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i;
const LINKEDIN_COMPANY_PATTERN = /linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/i;

/**
 * Resolve the identity of a row
 * 
 * This determines:
 * - Entity type (person vs company)
 * - Canonical identifiers
 * - Domain normalization
 */
export async function resolveIdentity(
    input: NormalizedInput,
    fieldsToEnrich: EnrichmentFieldKey[]
): Promise<EntityIdentity> {
    logger.info("🔍 IdentityResolver: Analyzing row", {
        rowId: input.rowId,
        hasName: !!input.name,
        hasDomain: !!input.domain,
        hasLinkedIn: !!input.linkedinUrl,
        hasEmail: !!input.email,
        hasCompany: !!input.company,
    });

    // Extract domain from various sources
    let domain: string | null = null;
    
    if (input.domain) {
        domain = normalizeDomain(input.domain);
    } else if (input.email) {
        domain = extractDomainFromEmail(input.email);
    } else if (input.linkedinUrl && LINKEDIN_COMPANY_PATTERN.test(input.linkedinUrl)) {
        // Can't extract domain from LinkedIn company URL directly
        // but we note it for later lookup
    }
    
    // Analyze LinkedIn URL type
    let linkedinType: 'person' | 'company' | null = null;
    let linkedinSlug: string | null = null;
    
    if (input.linkedinUrl) {
        const personMatch = input.linkedinUrl.match(LINKEDIN_PERSON_PATTERN);
        const companyMatch = input.linkedinUrl.match(LINKEDIN_COMPANY_PATTERN);
        
        if (personMatch) {
            linkedinType = 'person';
            linkedinSlug = personMatch[1] ?? null;
        } else if (companyMatch) {
            linkedinType = 'company';
            linkedinSlug = companyMatch[1] ?? null;
        }
    }
    
    // Calculate entity type based on signals
    let personScore = 0;
    let companyScore = 0;
    
    // Name is a strong person signal (unless it looks like a company name)
    if (input.name) {
        const looksLikeCompany = /\b(inc|llc|ltd|corp|company|co\.?|group|holdings?)\b/i.test(input.name);
        if (looksLikeCompany) {
            companyScore += 2;
        } else {
            personScore += 2;
        }
    }
    
    // Email suggests person
    if (input.email) {
        personScore += 1;
    }
    
    // LinkedIn type is a strong signal
    if (linkedinType === 'person') {
        personScore += 3;
    } else if (linkedinType === 'company') {
        companyScore += 3;
    }
    
    // Company name is a company signal
    if (input.company) {
        companyScore += 2;
    }
    
    // Domain without person signals suggests company
    if (domain && !input.name && !input.email) {
        companyScore += 1;
    }
    
    // Check what fields are being requested
    const personFields: EnrichmentFieldKey[] = ['name', 'title', 'shortBio', 'emailCandidates'];
    const companyFields: EnrichmentFieldKey[] = ['company', 'companySize', 'companySummary', 'techStack', 'funding'];
    
    const requestedPersonFields = fieldsToEnrich.filter(f => personFields.includes(f)).length;
    const requestedCompanyFields = fieldsToEnrich.filter(f => companyFields.includes(f)).length;
    
    personScore += requestedPersonFields * 0.5;
    companyScore += requestedCompanyFields * 0.5;
    
    // Determine entity type
    let entityType: 'person' | 'company' | 'unknown';
    if (personScore > companyScore && personScore >= 2) {
        entityType = 'person';
    } else if (companyScore > personScore && companyScore >= 2) {
        entityType = 'company';
    } else {
        entityType = 'unknown';
    }
    
    // Calculate confidence
    const totalScore = personScore + companyScore;
    const dominantScore = Math.max(personScore, companyScore);
    const confidence = totalScore > 0 ? (dominantScore / totalScore) * Math.min(1, totalScore / 5) : 0;
    
    const result: EntityIdentity = {
        entityType,
        canonicalName: input.name || null,
        canonicalCompany: input.company || null,
        domain,
        linkedinUrl: input.linkedinUrl || null,
        confidence: Math.round(confidence * 100) / 100,
    };
    
    logger.info("✅ IdentityResolver: Resolution complete", {
        rowId: input.rowId,
        entityType: result.entityType,
        confidence: result.confidence,
        personScore,
        companyScore,
    });
    
    return result;
}

/**
 * Validate if we have enough information to proceed with enrichment
 */
export function hasMinimumIdentity(identity: EntityIdentity): boolean {
    // We need at least one of: name, company, domain, or LinkedIn URL
    return !!(
        identity.canonicalName ||
        identity.canonicalCompany ||
        identity.domain ||
        identity.linkedinUrl
    );
}

/**
 * Get recommended tools based on entity type
 */
export function getRecommendedTools(identity: EntityIdentity): string[] {
    const tools: string[] = [];
    
    if (identity.entityType === 'person') {
        // Person-centric enrichment
        if (identity.linkedinUrl) {
            tools.push('LinkedInParserTool');
        } else {
            tools.push('SERPDiscoveryTool'); // Find LinkedIn
        }
        tools.push('GitHubProfileTool');
        tools.push('EmailPatternInferenceTool');
    } else if (identity.entityType === 'company') {
        // Company-centric enrichment
        if (identity.domain) {
            tools.push('CompanyAboutScraperTool');
        }
        tools.push('SERPDiscoveryTool');
        if (identity.linkedinUrl) {
            tools.push('LinkedInParserTool');
        }
    } else {
        // Unknown - try discovery first
        tools.push('SERPDiscoveryTool');
    }
    
    return tools;
}
