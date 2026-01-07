/**
 * Classifier Module
 *
 * Classification-first enrichment system.
 * Every enrichment request goes through classification before any provider calls.
 */

// Types
export {
    type EntityType,
    type IdentityStrength,
    type InputSignature,
    type AmbiguityRisk,
    type EnrichmentStrategy,
    type DataSensitivityLevel,
    type ResultState,
    type ConfidenceBucket,
    type ClassificationResult,
    COMMON_FIRST_NAMES,
    BIG_COMPANIES,
    CLASSIFICATION_THRESHOLDS,
    getConfidenceBucket,
    getAllowedSensitivity,
} from "./types";

// Input Classifier
export { classifyInput } from "./input-classifier";

// Tool Registry
export {
    type ToolDefinition,
    TOOL_REGISTRY,
    getToolById,
    getToolsForEntityType,
    getToolsForStrategy,
    getMatchingTools,
    getToolsForOutput,
    canRunTool,
    calculateTotalCost,
} from "./tool-registry";

// Super Agent
export {
    type WorkflowStep,
    type WorkflowPlan,
    type WorkflowError,
    generateWorkflow,
    isValidWorkflow,
    getNextStep,
    shouldUseFallback,
} from "./super-agent";
