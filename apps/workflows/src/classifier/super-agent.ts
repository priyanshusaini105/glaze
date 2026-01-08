/**
 * Super Agent - Workflow Orchestrator
 *
 * Generates optimal workflow execution plan based on classification.
 * Creates primary workflow + fallback plan.
 *
 * Philosophy:
 * - Static tool selection (no dynamic AI agents)
 * - Fail fast on missing required data
 * - Conservative fallback strategies
 */

import { logger } from "@trigger.dev/sdk";
import type { ClassificationResult, ResultState } from "./types";
import {
    type ToolDefinition,
    getMatchingTools,
    canRunTool,
    calculateTotalCost,
    getToolById,
    getToolsForOutput,
    getToolsForEntityType,
} from "./tool-registry";

// ============================================================
// WORKFLOW TYPES
// ============================================================

/**
 * A single step in the workflow.
 */
export interface WorkflowStep {
    /** Step number (1-indexed) */
    stepNumber: number;

    /** Tool ID to execute */
    toolId: string;

    /** Tool name for logging */
    toolName: string;

    /** Fields this step depends on (must be available before running) */
    dependsOn: string[];

    /** Can this step fail without aborting? */
    canFail: boolean;

    /** Fallback tool if this fails */
    fallbackToolId?: string;

    /** Expected outputs from this step */
    expectedOutputs: string[];

    /** Cost in cents */
    costCents: number;
}

/**
 * Complete workflow plan.
 */
export interface WorkflowPlan {
    /** Classification that generated this plan */
    classification: ClassificationResult;

    /** Primary workflow steps */
    steps: WorkflowStep[];

    /** Fallback workflow if primary fails */
    fallbackPlan: WorkflowStep[];

    /** Total expected cost (cents) */
    maxCostCents: number;

    /** Expected minimum confidence */
    expectedConfidence: number;

    /** Human-readable plan summary */
    summary: string;
}

/**
 * Workflow generation error.
 */
export interface WorkflowError {
    error: string;
    resultState: ResultState;
    reason: string;
}

// ============================================================
// WORKFLOW GENERATION
// ============================================================

/**
 * Generate a workflow plan from classification result.
 *
 * IMPORTANT: This now implements FIELD CAPABILITY PLANNING.
 * The workflow is validated to ensure it can produce the targetField.
 * If the initial workflow cannot produce the target field, additional
 * tools are appended to satisfy the field requirement.
 *
 * @param classification - Classification result from input classifier
 * @param existingData - Existing row data (for checking available fields)
 * @param targetField - The specific field we need to enrich (e.g., "industry")
 * @returns WorkflowPlan if successful, WorkflowError if should fail fast
 */
export function generateWorkflow(
    classification: ClassificationResult,
    existingData: Record<string, unknown>,
    targetField?: string
): WorkflowPlan | WorkflowError {
    logger.info("🎭 SuperAgent: Generating workflow", {
        entityType: classification.entityType,
        strategy: classification.strategy,
        signature: classification.inputSignature,
        targetField: targetField || "(any)",
    });

    // Fail fast cases
    if (classification.strategy === "FAIL_FAST") {
        return {
            error: classification.failReason || "Invalid input",
            resultState: "INVALID_INPUT",
            reason: classification.reason || "Cannot enrich without required context",
        };
    }

    // Check for empty row (no existing data)
    const availableFields = getAvailableFields(existingData);
    if (availableFields.length === 0) {
        return {
            error: "No existing data in row",
            resultState: "INVALID_INPUT",
            reason: "Cannot enrich without any existing data. Provide at least one identifier (name, company, domain, email, or LinkedIn URL).",
        };
    }

    // Get matching tools for this classification
    const tools = getMatchingTools(classification.entityType, classification.strategy);

    if (tools.length === 0) {
        return {
            error: "No tools available for this classification",
            resultState: "NOT_FOUND",
            reason: `No tools support ${classification.entityType} with ${classification.strategy} strategy`,
        };
    }

    // Build workflow based on strategy
    let steps: WorkflowStep[];
    let fallbackPlan: WorkflowStep[];

    switch (classification.strategy) {
        case "DIRECT_LOOKUP":
            ({ steps, fallbackPlan } = buildDirectLookupWorkflow(tools, availableFields));
            break;

        case "HYPOTHESIS_AND_SCORE":
            ({ steps, fallbackPlan } = buildHypothesisWorkflow(tools, availableFields));
            break;

        case "SEARCH_AND_VALIDATE":
            ({ steps, fallbackPlan } = buildSearchValidateWorkflow(tools, availableFields));
            break;

        default:
            ({ steps, fallbackPlan } = buildSearchValidateWorkflow(tools, availableFields));
    }

    // Filter to only runnable steps
    steps = filterRunnableSteps(steps, availableFields);
    fallbackPlan = filterRunnableSteps(fallbackPlan, availableFields);

    if (steps.length === 0) {
        return {
            error: "No runnable tools with available data",
            resultState: "NOT_FOUND",
            reason: `Available fields [${availableFields.join(", ")}] do not satisfy any tool requirements`,
        };
    }

    // ============================================================
    // FIELD CAPABILITY PLANNING (Critical Fix)
    // ============================================================
    // Check if the current workflow can produce the target field.
    // If not, extend the workflow with tools that CAN produce it.
    if (targetField) {
        const normalizedTargetField = normalizeFieldName(targetField);
        const workflowOutputs = new Set<string>();

        // Collect all outputs from current workflow
        steps.forEach(step => step.expectedOutputs.forEach(o => workflowOutputs.add(o)));

        // Check if workflow can produce target field
        const canProduceTarget = workflowOutputs.has(normalizedTargetField);

        logger.info("🎯 SuperAgent: Field capability check", {
            targetField: normalizedTargetField,
            workflowOutputs: Array.from(workflowOutputs),
            canProduceTarget,
        });

        if (!canProduceTarget) {
            // Find tools that can produce this field
            const fieldProducers = getToolsForOutput(normalizedTargetField);

            logger.info("🔧 SuperAgent: Field not in workflow, finding producers", {
                targetField: normalizedTargetField,
                producerCount: fieldProducers.length,
                producers: fieldProducers.map(t => t.name),
            });

            if (fieldProducers.length === 0) {
                return {
                    error: `No tools can produce field: ${normalizedTargetField}`,
                    resultState: "NOT_FOUND",
                    reason: `No registered tool can produce the field "${targetField}". Check tool registry for available outputs.`,
                };
            }

            // Filter to same entity type and runnable with available + workflow outputs
            const combinedAvailable = [...availableFields, ...Array.from(workflowOutputs)];
            const compatibleProducers = fieldProducers
                .filter(t => t.entityTypes.includes(classification.entityType))
                .filter(t => {
                    const { canRun } = canRunTool(t, combinedAvailable);
                    return canRun;
                })
                .sort((a, b) => a.priority - b.priority);

            if (compatibleProducers.length === 0) {
                // Try to find producers that could run if we add intermediate steps
                const producersNeedingInputs = fieldProducers
                    .filter(t => t.entityTypes.includes(classification.entityType))
                    .map(t => {
                        const { missing } = canRunTool(t, combinedAvailable);
                        return { tool: t, missing };
                    })
                    .filter(({ missing }) => missing.length > 0);

                if (producersNeedingInputs.length > 0) {
                    const firstProducer = producersNeedingInputs[0]!;
                    return {
                        error: `Cannot produce field: ${normalizedTargetField}`,
                        resultState: "NOT_FOUND",
                        reason: `Tool "${firstProducer.tool.name}" can produce "${targetField}" but requires: [${firstProducer.missing.join(", ")}]. Configure these fields first.`,
                    };
                }

                return {
                    error: `No compatible tools for field: ${normalizedTargetField}`,
                    resultState: "NOT_FOUND",
                    reason: `Tools that produce "${targetField}" are not compatible with entity type ${classification.entityType}`,
                };
            }

            // Add the best producer to the workflow
            const producer = compatibleProducers[0]!;
            const nextStepNumber = steps.length + 1;
            const producerStep = createStep(nextStepNumber, producer);

            steps.push(producerStep);

            logger.info("✅ SuperAgent: Extended workflow with field producer", {
                addedTool: producer.name,
                targetField: normalizedTargetField,
                newStepCount: steps.length,
            });
        }
    }

    // Calculate costs and confidence
    const maxCostCents = calculateTotalCost(steps.map(s => s.toolId));
    const expectedConfidence = estimateConfidence(classification, steps.length);

    const plan: WorkflowPlan = {
        classification,
        steps,
        fallbackPlan,
        maxCostCents,
        expectedConfidence,
        summary: buildPlanSummary(classification, steps),
    };

    logger.info("✅ SuperAgent: Workflow generated", {
        totalSteps: steps.length,
        fallbackSteps: fallbackPlan.length,
        maxCostCents,
        expectedConfidence,
        summary: plan.summary,
        targetField: targetField || "(any)",
    });

    return plan;
}

// ============================================================
// WORKFLOW BUILDERS
// ============================================================

/**
 * Build workflow for DIRECT_LOOKUP strategy.
 * Single tool call with minimal fallback.
 */
function buildDirectLookupWorkflow(
    tools: ToolDefinition[],
    availableFields: string[]
): { steps: WorkflowStep[]; fallbackPlan: WorkflowStep[] } {
    const steps: WorkflowStep[] = [];
    const fallbackPlan: WorkflowStep[] = [];

    // Direct lookup uses the first matching tool
    const primaryTool = tools[0];
    if (primaryTool) {
        steps.push(createStep(1, primaryTool));

        // Add fallback if available
        if (primaryTool.fallbackTool) {
            const fallbackTool = getToolById(primaryTool.fallbackTool);
            if (fallbackTool) {
                fallbackPlan.push(createStep(1, fallbackTool));
            }
        }
    }

    return { steps, fallbackPlan };
}

/**
 * Build workflow for HYPOTHESIS_AND_SCORE strategy.
 * Generate candidates → Score → Validate
 */
function buildHypothesisWorkflow(
    tools: ToolDefinition[],
    availableFields: string[]
): { steps: WorkflowStep[]; fallbackPlan: WorkflowStep[] } {
    const steps: WorkflowStep[] = [];
    const fallbackPlan: WorkflowStep[] = [];
    let stepNumber = 1;

    // Step 1: Resolution tool (generates hypotheses)
    const resolutionTools = tools.filter(t =>
        t.id.includes("resolve") || t.id.includes("search")
    );
    if (resolutionTools[0]) {
        steps.push(createStep(stepNumber++, resolutionTools[0]));
    }

    // Step 2: Profile/enrichment tool
    const profileTools = tools.filter(t =>
        t.id.includes("profile") || t.id.includes("summarizer")
    );
    if (profileTools[0]) {
        steps.push(createStep(stepNumber++, profileTools[0]));
    }

    // Fallback: Serper search
    const serperTool = tools.find(t => t.id.includes("serper"));
    if (serperTool) {
        fallbackPlan.push(createStep(1, serperTool));
    }

    return { steps, fallbackPlan };
}

/**
 * Build workflow for SEARCH_AND_VALIDATE strategy.
 * Search → Verify → Score
 */
function buildSearchValidateWorkflow(
    tools: ToolDefinition[],
    availableFields: string[]
): { steps: WorkflowStep[]; fallbackPlan: WorkflowStep[] } {
    const steps: WorkflowStep[] = [];
    const fallbackPlan: WorkflowStep[] = [];
    let stepNumber = 1;

    // Step 1: Search tool
    const searchTools = tools.filter(t =>
        t.id.includes("serper") || t.id.includes("search")
    );
    if (searchTools[0]) {
        steps.push(createStep(stepNumber++, searchTools[0]));
    }

    // Step 2: Resolution tool
    const resolutionTools = tools.filter(t =>
        t.id.includes("resolve")
    );
    if (resolutionTools[0]) {
        steps.push(createStep(stepNumber++, resolutionTools[0]));
    }

    // Step 3: Profile tool
    const profileTools = tools.filter(t =>
        t.id.includes("profile") || t.id.includes("summarizer")
    );
    if (profileTools[0]) {
        steps.push(createStep(stepNumber++, profileTools[0]));
    }

    return { steps, fallbackPlan };
}

// ============================================================
// HELPERS
// ============================================================

/**
 * Create a workflow step from a tool definition.
 */
function createStep(stepNumber: number, tool: ToolDefinition): WorkflowStep {
    return {
        stepNumber,
        toolId: tool.id,
        toolName: tool.name,
        dependsOn: tool.requiredInputs,
        canFail: tool.canFail,
        fallbackToolId: tool.fallbackTool,
        expectedOutputs: tool.outputs,
        costCents: tool.costCents,
    };
}

/**
 * Get available fields from existing data.
 */
function getAvailableFields(data: Record<string, unknown>): string[] {
    const fields: string[] = [];
    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== "") {
            // Normalize field names
            const normalizedKey = normalizeFieldName(key);
            fields.push(normalizedKey);
        }
    }
    return fields;
}

/**
 * Normalize field name to standard format.
 */
function normalizeFieldName(key: string): string {
    const lowerKey = key.toLowerCase().replace(/\s+/g, "_");
    const mappings: Record<string, string> = {
        "company_name": "company",
        "linkedin": "linkedinUrl",
        "linkedin_url": "linkedinUrl",
        "website": "domain",
        "email_address": "email",
        "full_name": "name",
        "person_name": "name",
    };
    return mappings[lowerKey] || lowerKey;
}

/**
 * Filter steps to only those that can run with available fields.
 */
function filterRunnableSteps(
    steps: WorkflowStep[],
    availableFields: string[]
): WorkflowStep[] {
    const available = new Set(availableFields);

    return steps.filter(step => {
        // Check if all dependencies are met
        const canRun = step.dependsOn.every(dep => available.has(dep));

        // After running, add expected outputs to available
        if (canRun) {
            step.expectedOutputs.forEach(output => available.add(output));
        }

        return canRun;
    });
}

/**
 * Estimate confidence based on classification and workflow.
 */
function estimateConfidence(
    classification: ClassificationResult,
    stepCount: number
): number {
    let confidence = 0.5;

    // Identity strength boost
    switch (classification.identityStrength) {
        case "STRONG":
            confidence += 0.3;
            break;
        case "MODERATE":
            confidence += 0.15;
            break;
        case "WEAK":
            confidence += 0.05;
            break;
    }

    // Ambiguity penalty
    switch (classification.ambiguityRisk) {
        case "LOW":
            confidence += 0.1;
            break;
        case "MEDIUM":
            break;
        case "HIGH":
            confidence -= 0.15;
            break;
    }

    // More steps = potentially more data = higher confidence
    confidence += Math.min(stepCount * 0.05, 0.15);

    return Math.min(0.95, Math.max(0.1, confidence));
}

/**
 * Build human-readable plan summary.
 */
function buildPlanSummary(
    classification: ClassificationResult,
    steps: WorkflowStep[]
): string {
    const toolNames = steps.map(s => s.toolName).join(" → ");
    return `${classification.strategy}: ${toolNames} (${classification.entityType})`;
}

// ============================================================
// WORKFLOW EXECUTION HELPERS
// ============================================================

/**
 * Check if workflow is valid (for validation).
 */
export function isValidWorkflow(plan: WorkflowPlan): boolean {
    return plan.steps.length > 0;
}

/**
 * Get next step to execute.
 */
export function getNextStep(
    plan: WorkflowPlan,
    completedSteps: number[]
): WorkflowStep | null {
    const completedSet = new Set(completedSteps);
    return plan.steps.find(s => !completedSet.has(s.stepNumber)) || null;
}

/**
 * Should use fallback plan?
 */
export function shouldUseFallback(
    plan: WorkflowPlan,
    failedSteps: number[]
): boolean {
    // Use fallback if any non-optional step failed
    return plan.steps.some(
        step => failedSteps.includes(step.stepNumber) && !step.canFail
    );
}
