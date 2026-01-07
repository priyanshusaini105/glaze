/**
 * Input Classifier
 *
 * The "spine" of the enrichment system.
 * Classifies input BEFORE any enrichment to determine the correct strategy.
 *
 * Philosophy:
 * - Never guess
 * - Never be brave
 * - Fail fast on invalid input
 * - Conservative classification
 */

import { logger } from "@trigger.dev/sdk";
import type { NormalizedInput } from "../types/enrichment";
import {
    type EntityType,
    type IdentityStrength,
    type InputSignature,
    type AmbiguityRisk,
    type EnrichmentStrategy,
    type DataSensitivityLevel,
    type ClassificationResult,
    COMMON_FIRST_NAMES,
    BIG_COMPANIES,
    getAllowedSensitivity,
} from "./types";

// ============================================================
// PATTERNS
// ============================================================

const LINKEDIN_PERSON_PATTERN = /linkedin\.com\/in\/([a-zA-Z0-9\-_]+)/i;
const LINKEDIN_COMPANY_PATTERN = /linkedin\.com\/company\/([a-zA-Z0-9\-_]+)/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_PATTERN = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/;

// Free email domains
const FREE_EMAIL_DOMAINS = new Set([
    "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
    "icloud.com", "me.com", "mac.com", "aol.com", "protonmail.com",
    "proton.me", "mail.com", "zoho.com", "yandex.com", "gmx.com",
]);

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Extract domain from email address
 */
function getDomainFromEmail(email: string): string | null {
    const parts = email.split("@");
    if (parts.length !== 2) return null;
    return parts[1]?.toLowerCase() ?? null;
}

/**
 * Check if a name looks like a company name
 */
function looksLikeCompanyName(name: string): boolean {
    const companyPatterns = /\b(inc|llc|ltd|corp|company|co\.?|group|holdings?|gmbh|ag|sa|bv|nv|plc)\b/i;
    return companyPatterns.test(name);
}

/**
 * Check if name is common
 */
function isCommonName(name: string): boolean {
    const firstName = name.toLowerCase().split(/\s+/)[0];
    return firstName ? COMMON_FIRST_NAMES.has(firstName) : false;
}

/**
 * Check if company is a big company
 */
function isBigCompany(company: string): boolean {
    const normalized = company.toLowerCase().replace(/[^a-z0-9]/g, "");
    return BIG_COMPANIES.has(normalized);
}

/**
 * Check if domain is a free email domain
 */
function isFreeEmailDomain(domain: string): boolean {
    return FREE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Validate domain format
 */
function isValidDomain(domain: string): boolean {
    return DOMAIN_PATTERN.test(domain);
}

// ============================================================
// CLASSIFICATION LOGIC
// ============================================================

/**
 * Determine input signature from available fields
 */
function determineInputSignature(input: NormalizedInput): InputSignature {
    const hasLinkedIn = !!input.linkedinUrl;
    const hasName = !!input.name && input.name.trim().length > 0;
    const hasCompany = !!input.company && input.company.trim().length > 0;
    const hasEmail = !!input.email && EMAIL_PATTERN.test(input.email);
    const hasDomain = !!input.domain && isValidDomain(input.domain);

    // Check LinkedIn URL type
    if (hasLinkedIn) {
        if (LINKEDIN_PERSON_PATTERN.test(input.linkedinUrl!)) {
            return "PERSON_LINKEDIN_URL";
        }
        if (LINKEDIN_COMPANY_PATTERN.test(input.linkedinUrl!)) {
            return "COMPANY_LINKEDIN_URL";
        }
    }

    // Domain-first patterns
    if (hasDomain && !hasName && !hasEmail) {
        return "COMPANY_DOMAIN";
    }

    // Person patterns
    if (hasName) {
        if (looksLikeCompanyName(input.name!)) {
            return "COMPANY_NAME_ONLY";
        }
        if (hasCompany) {
            return "PERSON_NAME_COMPANY";
        }
        return "PERSON_NAME_ONLY";
    }

    // Email pattern
    if (hasEmail) {
        const domain = getDomainFromEmail(input.email!);
        if (domain && !isFreeEmailDomain(domain)) {
            return "PERSON_EMAIL";
        }
        return "PERSON_NAME_ONLY"; // Fallback for free email
    }

    // Company name only
    if (hasCompany) {
        return "COMPANY_NAME_ONLY";
    }

    // Domain fallback
    if (hasDomain) {
        return "COMPANY_DOMAIN";
    }

    return "UNKNOWN_SIGNATURE";
}

/**
 * Determine entity type from signature
 */
function determineEntityType(signature: InputSignature): EntityType {
    switch (signature) {
        case "PERSON_LINKEDIN_URL":
        case "PERSON_NAME_COMPANY":
        case "PERSON_NAME_ONLY":
        case "PERSON_EMAIL":
            return "PERSON";
        case "COMPANY_DOMAIN":
        case "COMPANY_LINKEDIN_URL":
        case "COMPANY_NAME_ONLY":
            return "COMPANY";
        default:
            return "UNKNOWN";
    }
}

/**
 * Determine identity strength
 */
function determineIdentityStrength(
    signature: InputSignature,
    input: NormalizedInput
): IdentityStrength {
    switch (signature) {
        case "PERSON_LINKEDIN_URL":
        case "COMPANY_LINKEDIN_URL":
            return "STRONG";

        case "COMPANY_DOMAIN":
            // Domain is strong only if it resolves
            if (input.domain && isValidDomain(input.domain)) {
                return "STRONG";
            }
            return "INVALID";

        case "PERSON_NAME_COMPANY":
            // Moderate unless common name + big company
            if (input.name && input.company) {
                if (isCommonName(input.name) && isBigCompany(input.company)) {
                    return "WEAK";
                }
                return "MODERATE";
            }
            return "WEAK";

        case "COMPANY_NAME_ONLY":
            return "MODERATE";

        case "PERSON_NAME_ONLY":
            return "WEAK";

        case "PERSON_EMAIL":
            return "MODERATE";

        case "UNKNOWN_SIGNATURE":
        default:
            return "INVALID";
    }
}

/**
 * Determine ambiguity risk
 */
function determineAmbiguityRisk(
    signature: InputSignature,
    input: NormalizedInput,
    identityStrength: IdentityStrength
): AmbiguityRisk {
    // LinkedIn URLs have low ambiguity
    if (signature === "PERSON_LINKEDIN_URL" || signature === "COMPANY_LINKEDIN_URL") {
        return "LOW";
    }

    // Strong identity = low ambiguity
    if (identityStrength === "STRONG") {
        return "LOW";
    }

    // Common name + big company = high ambiguity
    if (signature === "PERSON_NAME_COMPANY" && input.name && input.company) {
        if (isCommonName(input.name) && isBigCompany(input.company)) {
            return "HIGH";
        }
    }

    // Name only = high ambiguity
    if (signature === "PERSON_NAME_ONLY") {
        return "HIGH";
    }

    // Generic company names = high ambiguity
    if (signature === "COMPANY_NAME_ONLY" && input.company) {
        const genericPatterns = /^(abc|xyz|best|top|premier|global|universal|national|digital|tech)/i;
        if (genericPatterns.test(input.company)) {
            return "HIGH";
        }
    }

    // Default to medium
    return "MEDIUM";
}

/**
 * Determine enrichment strategy
 */
function determineStrategy(
    signature: InputSignature,
    identityStrength: IdentityStrength,
    ambiguityRisk: AmbiguityRisk
): EnrichmentStrategy {
    // Invalid input = fail fast
    if (identityStrength === "INVALID") {
        return "FAIL_FAST";
    }

    // LinkedIn URL or domain = direct lookup
    if (
        signature === "PERSON_LINKEDIN_URL" ||
        signature === "COMPANY_LINKEDIN_URL" ||
        signature === "COMPANY_DOMAIN"
    ) {
        return "DIRECT_LOOKUP";
    }

    // Name + company with moderate identity = hypothesis and score
    if (
        signature === "PERSON_NAME_COMPANY" ||
        signature === "COMPANY_NAME_ONLY"
    ) {
        return "HYPOTHESIS_AND_SCORE";
    }

    // High ambiguity = search and validate
    if (ambiguityRisk === "HIGH") {
        return "SEARCH_AND_VALIDATE";
    }

    // Default to search and validate
    return "SEARCH_AND_VALIDATE";
}

/**
 * Get required fields for enrichment based on entity type
 */
function getRequiredFields(entityType: EntityType, signature: InputSignature): string[] {
    if (entityType === "PERSON") {
        switch (signature) {
            case "PERSON_LINKEDIN_URL":
                return ["linkedinUrl"];
            case "PERSON_NAME_COMPANY":
                return ["name", "company"];
            case "PERSON_EMAIL":
                return ["email"];
            default:
                return ["name"];
        }
    }

    if (entityType === "COMPANY") {
        switch (signature) {
            case "COMPANY_DOMAIN":
                return ["domain"];
            case "COMPANY_LINKEDIN_URL":
                return ["linkedinUrl"];
            default:
                return ["company"];
        }
    }

    return [];
}

/**
 * Get available fields from input
 */
function getAvailableFields(input: NormalizedInput): string[] {
    const fields: string[] = [];
    if (input.name) fields.push("name");
    if (input.company) fields.push("company");
    if (input.domain) fields.push("domain");
    if (input.email) fields.push("email");
    if (input.linkedinUrl) fields.push("linkedinUrl");
    return fields;
}

/**
 * Validate required fields are present
 */
function validateRequiredFields(
    required: string[],
    available: string[]
): { valid: boolean; missing: string[] } {
    const availableSet = new Set(available);
    const missing = required.filter(f => !availableSet.has(f));
    return { valid: missing.length === 0, missing };
}

// ============================================================
// MAIN CLASSIFIER
// ============================================================

/**
 * Classify input for enrichment.
 *
 * This is the entry point for all enrichment requests.
 * It determines the correct strategy and validates input.
 *
 * @param input - Normalized input from the row
 * @returns Classification result with strategy and metadata
 */
export function classifyInput(input: NormalizedInput): ClassificationResult {
    logger.info("🔍 Classifier: Analyzing input", {
        rowId: input.rowId,
        hasName: !!input.name,
        hasCompany: !!input.company,
        hasDomain: !!input.domain,
        hasEmail: !!input.email,
        hasLinkedIn: !!input.linkedinUrl,
    });

    // Step 1: Determine input signature
    const inputSignature = determineInputSignature(input);

    // Step 2: Determine entity type
    const entityType = determineEntityType(inputSignature);

    // Step 3: Get required and available fields
    const requiredFields = getRequiredFields(entityType, inputSignature);
    const availableFields = getAvailableFields(input);

    // Step 4: Determine identity strength
    const identityStrength = determineIdentityStrength(inputSignature, input);

    // Step 5: Determine ambiguity risk
    const ambiguityRisk = determineAmbiguityRisk(inputSignature, input, identityStrength);

    // Step 6: Determine strategy
    const strategy = determineStrategy(inputSignature, identityStrength, ambiguityRisk);

    // Step 7: Determine sensitivity level
    const sensitivityLevel = getAllowedSensitivity(identityStrength, ambiguityRisk);

    // Step 8: Validate required fields
    const { valid: hasRequiredFields, missing } = validateRequiredFields(requiredFields, availableFields);

    // Build result
    const result: ClassificationResult = {
        entityType,
        identityStrength,
        inputSignature,
        ambiguityRisk,
        strategy,
        sensitivityLevel,
        requiredFields,
        availableFields,
    };

    // Override to FAIL_FAST if missing required fields
    if (!hasRequiredFields && entityType !== "UNKNOWN") {
        result.strategy = "FAIL_FAST";
        result.failReason = `Missing required fields: ${missing.join(", ")}`;
        result.reason = "Cannot enrich without required context data";
    }

    // Add reason for classification
    result.reason = buildClassificationReason(result);

    logger.info("✅ Classifier: Classification complete", {
        rowId: input.rowId,
        entityType: result.entityType,
        signature: result.inputSignature,
        strength: result.identityStrength,
        ambiguity: result.ambiguityRisk,
        strategy: result.strategy,
        reason: result.reason,
    });

    return result;
}

/**
 * Build human-readable reason for classification
 */
function buildClassificationReason(result: ClassificationResult): string {
    const parts: string[] = [];

    // Entity type
    parts.push(`Entity: ${result.entityType}`);

    // Signature description
    switch (result.inputSignature) {
        case "PERSON_LINKEDIN_URL":
            parts.push("LinkedIn profile URL detected");
            break;
        case "PERSON_NAME_COMPANY":
            parts.push("Name + Company combination");
            break;
        case "COMPANY_DOMAIN":
            parts.push("Company domain provided");
            break;
        case "COMPANY_NAME_ONLY":
            parts.push("Company name only");
            break;
        case "PERSON_NAME_ONLY":
            parts.push("Name only (high ambiguity)");
            break;
    }

    // Ambiguity warning
    if (result.ambiguityRisk === "HIGH") {
        parts.push("⚠️ High ambiguity risk");
    }

    // Strategy
    parts.push(`Strategy: ${result.strategy}`);

    return parts.join(" | ");
}

// ============================================================
// EXPORTS
// ============================================================

export {
    type EntityType,
    type IdentityStrength,
    type InputSignature,
    type AmbiguityRisk,
    type EnrichmentStrategy,
    type DataSensitivityLevel,
    type ClassificationResult,
} from "./types";
