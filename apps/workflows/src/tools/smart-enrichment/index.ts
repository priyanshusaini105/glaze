/**
 * Smart Enrichment Module
 * 
 * 3-layer enrichment workflow:
 * 1. Candidate Collection - Find multiple candidates via Serper
 * 2. Verification - Score each candidate with lightweight checks
 * 3. Decision - Accept/reject with honest confidence
 * 
 * This module provides explainable, verifiable enrichment results.
 */

export { collectCandidates, type SearchCandidate, type CandidateCollectionResult } from "./candidate-collector";
export { verifyCandidate, verifyCandidates, type VerificationResult } from "./domain-verifier";
export { makeDecision, formatForStorage, type EnrichmentDecision } from "./candidate-scorer";
export { SmartEnrichmentProvider, smartEnrichmentProvider } from "./smart-enrichment-provider";
