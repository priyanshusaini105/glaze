/**
 * Classification Types
 *
 * Strict enums and interfaces for input classification.
 * These types form the "spine" of the enrichment system.
 */

// ============================================================
// ENTITY CLASSIFICATION
// ============================================================

/**
 * Top-level entity type classification.
 * Determines whether we're resolving a person or company.
 */
export type EntityType = "PERSON" | "COMPANY" | "UNKNOWN";

/**
 * Identity strength classification.
 * How confident is the identifier BEFORE any enrichment?
 */
export type IdentityStrength = "STRONG" | "MODERATE" | "WEAK" | "INVALID";

/**
 * Input signature classification.
 * What exactly did the user give us?
 */
export type InputSignature =
    | "PERSON_LINKEDIN_URL"     // LinkedIn profile URL for a person
    | "PERSON_NAME_COMPANY"     // Name + company combination
    | "PERSON_NAME_ONLY"        // Just a name, no company
    | "PERSON_EMAIL"            // Email address (can derive person info)
    | "COMPANY_DOMAIN"          // Company domain (stripe.com)
    | "COMPANY_LINKEDIN_URL"    // LinkedIn company page
    | "COMPANY_NAME_ONLY"       // Just company name
    | "UNKNOWN_SIGNATURE";      // Cannot determine

// ============================================================
// RISK & STRATEGY
// ============================================================

/**
 * Ambiguity risk classification.
 * Predicts whether disambiguation will be needed.
 */
export type AmbiguityRisk = "LOW" | "MEDIUM" | "HIGH";

/**
 * Enrichment strategy classification.
 * What execution path should we take?
 */
export type EnrichmentStrategy =
    | "DIRECT_LOOKUP"           // Single tool call (LinkedIn URL, domain)
    | "SEARCH_AND_VALIDATE"     // Search → Verify → Score
    | "HYPOTHESIS_AND_SCORE"    // Generate candidates → Score → Pick best
    | "FAIL_FAST";              // Invalid input, stop immediately

/**
 * Data sensitivity level.
 * Controls which fields are allowed based on identity confidence.
 */
export type DataSensitivityLevel =
    | "PUBLIC_ONLY"             // Only public data (name, title, company)
    | "SEMI_PRIVATE"            // Includes email patterns, contact info
    | "INFERRED";               // AI-generated bio, tech stack, etc.

// ============================================================
// RESULT STATES
// ============================================================

/**
 * Final result state for enrichment.
 * Every enrichment must return one of these.
 */
export type ResultState =
    | "SUCCESS"                 // Full enrichment succeeded
    | "PARTIAL_SUCCESS"         // Some fields enriched, others failed
    | "AMBIGUOUS"               // Multiple candidates, couldn't decide
    | "NOT_FOUND"               // No data found
    | "INVALID_INPUT";          // Input was invalid/insufficient

/**
 * Confidence bucket for threshold-based decisions.
 */
export type ConfidenceBucket =
    | "HIGH_CONFIDENCE"         // >= 0.85
    | "MEDIUM_CONFIDENCE"       // 0.65 - 0.84
    | "LOW_CONFIDENCE";         // < 0.65

// ============================================================
// CLASSIFICATION RESULT
// ============================================================

/**
 * Full classification result from the input classifier.
 * This is the output of classifyInput() and drives all downstream decisions.
 */
export interface ClassificationResult {
    /** Entity type (person or company) */
    entityType: EntityType;

    /** Identity strength before enrichment */
    identityStrength: IdentityStrength;

    /** What input signature was detected */
    inputSignature: InputSignature;

    /** Predicted ambiguity risk */
    ambiguityRisk: AmbiguityRisk;

    /** Recommended enrichment strategy */
    strategy: EnrichmentStrategy;

    /** Data sensitivity level allowed */
    sensitivityLevel: DataSensitivityLevel;

    /** Fields required for this classification */
    requiredFields: string[];

    /** Available fields from input */
    availableFields: string[];

    /** Reason for classification (for debugging/logging) */
    reason?: string;

    /** If FAIL_FAST, what's the error? */
    failReason?: string;
}

// ============================================================
// COMMON NAME DETECTION
// ============================================================

/**
 * List of common first names that increase ambiguity risk.
 */
export const COMMON_FIRST_NAMES = new Set([
    "john", "james", "michael", "david", "robert", "william", "richard",
    "joseph", "thomas", "charles", "mary", "patricia", "jennifer", "linda",
    "elizabeth", "barbara", "susan", "jessica", "sarah", "karen", "alex",
    "chris", "sam", "taylor", "jordan", "morgan", "casey", "jamie",
]);

/**
 * Big companies that increase ambiguity risk when combined with common names.
 */
export const BIG_COMPANIES = new Set([
    "google", "amazon", "microsoft", "apple", "meta", "facebook",
    "netflix", "uber", "airbnb", "salesforce", "oracle", "ibm",
    "intel", "cisco", "adobe", "vmware", "dell", "hp", "linkedin",
    "twitter", "x", "snap", "pinterest", "spotify", "stripe",
    "paypal", "square", "block", "shopify", "zoom", "slack",
    "dropbox", "box", "atlassian", "github", "gitlab", "mongodb",
    "snowflake", "databricks", "palantir", "coinbase", "robinhood",
]);

// ============================================================
// CONFIDENCE THRESHOLDS
// ============================================================

/**
 * Confidence thresholds for classification decisions.
 */
export const CLASSIFICATION_THRESHOLDS = {
    /** Minimum confidence for HIGH bucket */
    HIGH: 0.85,
    /** Minimum confidence for MEDIUM bucket */
    MEDIUM: 0.65,
    /** Below this is FAIL */
    LOW: 0.40,
} as const;

/**
 * Map a confidence score to a bucket.
 */
export function getConfidenceBucket(confidence: number): ConfidenceBucket {
    if (confidence >= CLASSIFICATION_THRESHOLDS.HIGH) {
        return "HIGH_CONFIDENCE";
    }
    if (confidence >= CLASSIFICATION_THRESHOLDS.MEDIUM) {
        return "MEDIUM_CONFIDENCE";
    }
    return "LOW_CONFIDENCE";
}

/**
 * Get allowed sensitivity level based on identity strength.
 */
export function getAllowedSensitivity(
    identityStrength: IdentityStrength,
    ambiguityRisk: AmbiguityRisk
): DataSensitivityLevel {
    if (identityStrength === "STRONG" && ambiguityRisk === "LOW") {
        return "SEMI_PRIVATE";
    }
    if (identityStrength === "STRONG" || identityStrength === "MODERATE") {
        return "PUBLIC_ONLY";
    }
    return "PUBLIC_ONLY";
}
