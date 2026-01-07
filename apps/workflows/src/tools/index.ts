/**
 * Tools Index
 */

// Providers
export * from "./providers";

// Classification System
export * from "../classifier";

// Utilities
export { initCostController, canSpend, recordSpend, getRemainingBudget, getCostSummary, clearCostController } from "./utils/cost-controller";
export { normalizeInput, extractDomain, normalizeName, normalizeCompanyName } from "./utils/normalizer";

// ============================================================
// AGENTIC TOOLS (NEW)
// ============================================================

// Identity & Normalization Tools
export { resolveIdentity, hasMinimumIdentity, getRecommendedTools } from "./identity-resolver";

export {
    normalizeDomain,
    extractDomainFromEmail,
    extractDomainFromUrl,
    isFreeEmailDomain,
    getRootDomain,
    domainsMatch,
    normalizeDomainsArray
} from "./domain-normalizer";

// Company Resolution Tools
export { resolveCompanyIdentityFromDomain } from "./company/resolve-company-identity-from-domain";
export type { CompanyResolutionResult } from "./company/resolve-company-identity-from-domain";
export { resolveCompanyIdentityFromName } from "./company/resolve-company-identity-from-name";
export type { CompanyNameResolutionResult } from "./company/resolve-company-identity-from-name";

// Provenance Tools
export {
    recordProvenance,
    exportProvenanceRecords,
    getProvenanceForField,
    getProvenanceSummary,
    resetProvenanceStore,
    getProvenanceForRow,
    getProvenanceForRowField,
    getProvenanceBySource,
    calculateTotalCost,
    getCostBreakdownBySource,
    recordProvenanceBatch,
    findConflicts,
    fromLegacyProvenance,
} from "./provenance-recorder";

// Aggregation Tools
export { ConfidenceAggregator, aggregateField, aggregateAllFields, checkConfidenceThresholds, getAggregationSummary } from "./confidence-aggregator";
export type { AggregatedField } from "./confidence-aggregator";

// Email Tools (Agentic)
export { emailPatternInferenceProvider, generateEmailCandidates } from "./email-pattern-inference";
export { emailVerifierProvider, EmailVerifierProvider, verifyEmail as verifyEmailAgentic, verifyEmailCandidates as verifyEmailCandidatesAgentic } from "./email-verifier";

// LLM Synthesis Tools
export { bioSynthesizerProvider, BioSynthesizerProvider } from "./bio-synthesizer";
export { companySummarizerProvider, CompanySummarizerProvider } from "./company/company-summarizer";

// Simple Enrichment
export { runEnrichment, runTestCases } from "./simple-enrichment";
export type { TestInput, EnrichmentResult } from "./simple-enrichment";

