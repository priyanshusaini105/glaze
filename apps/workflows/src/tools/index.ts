/**
 * Tools Index
 */

// Providers
export * from "@/tools/providers";

// Classification System
export * from "@/classifier";

// Utilities
export { initCostController, canSpend, recordSpend, getRemainingBudget, getCostSummary, clearCostController } from "@/tools/utils/cost-controller";
export { normalizeInput, extractDomain, normalizeName, normalizeCompanyName } from "@/tools/utils/normalizer";

// ============================================================
// AGENTIC TOOLS (NEW)
// ============================================================

// Identity & Normalization Tools
export { resolveIdentity, hasMinimumIdentity, getRecommendedTools } from "@/tools/identity-resolver";

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
export { fetchCompanyProfile, fetchCompanyProfileProvider, FetchCompanyProfileProvider } from "./company/fetch-company-profile";
export type { CompanyProfile } from "./company/fetch-company-profile";
export { fetchCompanySocials, fetchCompanySocialsProvider, FetchCompanySocialsProvider } from "./company/fetch-company-socials";
export type { CompanySocials, SocialLink, FetchCompanySocialsResult } from "./company/fetch-company-socials";
export { estimateCompanySize, estimateCompanySizeProvider, EstimateCompanySizeProvider } from "./company/estimate-company-size";
export type { CompanySizeResult, EmployeeCountRange, HiringStatus } from "./company/estimate-company-size";

// Person Resolution Tools
export { findLinkedInProfile, findLinkedInProfileProvider, FindLinkedInProfileProvider } from "./person/find-linkedin-profile";
export type { FindLinkedInProfileResult } from "./person/find-linkedin-profile";
export { resolvePersonFromLinkedIn, resolvePersonFromLinkedInProvider, ResolvePersonFromLinkedInProvider } from "./person/resolve-person-from-linkedin";
export type { PersonProfile } from "./person/resolve-person-from-linkedin";
export { resolvePersonFromNameCompany, resolvePersonFromNameCompanyProvider, ResolvePersonFromNameCompanyProvider } from "./person/resolve-person-from-name-company";
export type { ResolvePersonFromNameCompanyResult } from "./person/resolve-person-from-name-company";
export { guessWorkEmail, guessWorkEmailProvider, GuessWorkEmailProvider } from "./person/guess-work-email";
export type { GuessWorkEmailResult } from "./person/guess-work-email";
export { fetchPersonPublicProfile, fetchPersonPublicProfileProvider, FetchPersonPublicProfileProvider } from "./person/fetch-person-public-profile";
export type { FetchPersonPublicProfileResult, SocialLinks } from "./person/fetch-person-public-profile";

// Generic Fallback Tools
export { genericWebSearch, genericWebSearchProvider, GenericWebSearchProvider } from "./generic/generic-web-search";
export type { GenericWebSearchResult } from "./generic/generic-web-search";

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

