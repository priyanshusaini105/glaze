/**
 * Agents Index
 */

// Legacy agents
export { generateEnrichmentPlan } from "./concierge";
export { reconcileEvidence, getMissingFields } from "./reconciler";
export { synthesizeMissingFields } from "./synthesizer";

// ============================================================
// AGENTIC AGENTS (NEW)
// ============================================================

// Planner Agent
export { 
    generatePlan, 
    getFieldDiff,
    estimatePlanCost,
    isBudgetSufficient,
} from "./planner";

// Verifier Agent
export {
    verifyResults,
    getVerificationSummary,
    getEscalationTargets,
    hasUnresolvedConflicts,
    getConflictDetails,
    mergeCanonicalData,
} from "./verifier";
export type {
    VerificationDecision,
    FieldVerification,
    VerificationResult,
} from "./verifier";

