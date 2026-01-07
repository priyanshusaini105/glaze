/**
 * Tools Index
 */

// Providers
export * from "./providers";

// Verification (legacy)
export { verifyEmail, verifyEmailCandidates, inferEmailCandidates } from "./verification/email-verifier";

// Utilities
export { initCostController, canSpend, recordSpend, getRemainingBudget, getCostSummary, clearCostController } from "./utils/cost-controller";
export { normalizeInput, extractDomain, normalizeName, normalizeCompanyName } from "./utils/normalizer";

// ============================================================
// AGENTIC TOOLS (NEW)
// ============================================================

// Identity & Normalization Tools
export { resolveIdentity, hasMinimumIdentity } from "./identity-resolver";
export type { ResolvedIdentity } from "./identity-resolver";

export { normalizeDomain, extractDomain as extractDomainUrl, stripSubdomain, isValidDomain } from "./domain-normalizer";

// Provenance Tools
export {
    recordProvenance,
    exportProvenanceRecords,
    getProvenanceForField,
    getProvenanceSummary,
    resetProvenanceStore,
} from "./provenance-recorder";
export type { ProvenanceRecord, ProvenanceSummary } from "./provenance-recorder";

// Aggregation Tools
export { ConfidenceAggregator } from "./confidence-aggregator";
export type { AggregatedField, AggregationReport } from "./confidence-aggregator";

// Email Tools (Agentic)
export { emailPatternInferenceProvider, generateEmailCandidates } from "./email-pattern-inference";
export { emailVerifierProvider, EmailVerifierProvider } from "./email-verifier";
export type { EmailVerificationResult } from "./email-verifier";

// LLM Synthesis Tools
export { bioSynthesizerProvider, BioSynthesizerProvider } from "./bio-synthesizer";
export { companySummarizerProvider, CompanySummarizerProvider } from "./company-summarizer";

