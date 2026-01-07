/**
 * Tool Registry
 *
 * Static registry of all enrichment tools.
 * Maps tools to strategies, entity types, and required inputs.
 */

import type { ProviderTier } from "../types/enrichment";
import type { EntityType, EnrichmentStrategy } from "./types";

// ============================================================
// TOOL DEFINITION
// ============================================================

/**
 * Tool definition in the registry.
 */
export interface ToolDefinition {
    /** Unique tool identifier */
    id: string;

    /** Human-readable name */
    name: string;

    /** Compatible enrichment strategies */
    strategies: EnrichmentStrategy[];

    /** Compatible entity types */
    entityTypes: EntityType[];

    /** Required input fields */
    requiredInputs: string[];

    /** Optional input fields that improve results */
    optionalInputs: string[];

    /** Output fields this tool can provide */
    outputs: string[];

    /** Cost in cents */
    costCents: number;

    /** Provider tier */
    tier: ProviderTier;

    /** Tool priority (lower = run first) */
    priority: number;

    /** Can this tool fail gracefully? */
    canFail: boolean;

    /** Fallback tool ID if this fails */
    fallbackTool?: string;
}

// ============================================================
// COMPANY TOOLS
// ============================================================

const COMPANY_TOOLS: ToolDefinition[] = [
    {
        id: "resolve_company_from_domain",
        name: "Resolve Company From Domain",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: [],
        outputs: ["company", "domain", "website"],
        costCents: 0,
        tier: "free",
        priority: 1,
        canFail: true,
    },
    {
        id: "resolve_company_from_name",
        name: "Resolve Company From Name",
        strategies: ["HYPOTHESIS_AND_SCORE", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["company"],
        optionalInputs: ["industry"],
        outputs: ["company", "domain", "website"],
        costCents: 2,
        tier: "cheap",
        priority: 2,
        canFail: true,
        fallbackTool: "serper_company_search",
    },
    {
        id: "fetch_company_profile",
        name: "Fetch Company Profile",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: [],
        outputs: ["companySummary", "industry", "companySize"],
        costCents: 0,
        tier: "free",
        priority: 3,
        canFail: true,
    },
    {
        id: "estimate_company_size",
        name: "Estimate Company Size",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: ["company"],
        outputs: ["companySize"],
        costCents: 1,
        tier: "cheap",
        priority: 4,
        canFail: true,
    },
    {
        id: "detect_tech_stack",
        name: "Detect Tech Stack",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: [],
        outputs: ["techStack"],
        costCents: 0,
        tier: "free",
        priority: 5,
        canFail: true,
    },
    {
        id: "serper_company_search",
        name: "Serper Company Search",
        strategies: ["SEARCH_AND_VALIDATE", "HYPOTHESIS_AND_SCORE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["company"],
        optionalInputs: ["industry"],
        outputs: ["domain", "website", "companySummary"],
        costCents: 1,
        tier: "cheap",
        priority: 2,
        canFail: true,
    },
    {
        id: "company_summarizer",
        name: "Company Summarizer",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["COMPANY"],
        requiredInputs: ["domain"],
        optionalInputs: ["company"],
        outputs: ["companySummary"],
        costCents: 0,
        tier: "cheap",
        priority: 6,
        canFail: true,
    },
];

// ============================================================
// PERSON TOOLS
// ============================================================

const PERSON_TOOLS: ToolDefinition[] = [
    {
        id: "resolve_person_from_linkedin",
        name: "Resolve Person From LinkedIn",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["PERSON"],
        requiredInputs: ["linkedinUrl"],
        optionalInputs: [],
        outputs: ["name", "title", "company", "location"],
        costCents: 3,
        tier: "premium",
        priority: 1,
        canFail: false,
    },
    {
        id: "resolve_person_from_name_company",
        name: "Resolve Person From Name + Company",
        strategies: ["HYPOTHESIS_AND_SCORE", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name", "company"],
        optionalInputs: ["domain"],
        outputs: ["linkedinUrl", "title"],
        costCents: 2,
        tier: "cheap",
        priority: 2,
        canFail: true,
        fallbackTool: "serper_person_search",
    },
    {
        id: "serper_person_search",
        name: "Serper Person Search",
        strategies: ["SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name"],
        optionalInputs: ["company", "domain"],
        outputs: ["linkedinUrl", "shortBio"],
        costCents: 1,
        tier: "cheap",
        priority: 2,
        canFail: true,
    },
    {
        id: "email_pattern_inference",
        name: "Email Pattern Inference",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name", "domain"],
        optionalInputs: ["company"],
        outputs: ["emailCandidates"],
        costCents: 0,
        tier: "free",
        priority: 4,
        canFail: true,
    },
    {
        id: "email_verifier",
        name: "Email Verifier",
        strategies: ["DIRECT_LOOKUP"],
        entityTypes: ["PERSON"],
        requiredInputs: ["emailCandidates"],
        optionalInputs: [],
        outputs: ["email"],
        costCents: 1,
        tier: "cheap",
        priority: 5,
        canFail: true,
    },
    {
        id: "github_profile",
        name: "GitHub Profile",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name"],
        optionalInputs: ["company", "email"],
        outputs: ["socialLinks", "shortBio"],
        costCents: 0,
        tier: "free",
        priority: 6,
        canFail: true,
    },
    {
        id: "bio_synthesizer",
        name: "Bio Synthesizer",
        strategies: ["DIRECT_LOOKUP", "SEARCH_AND_VALIDATE"],
        entityTypes: ["PERSON"],
        requiredInputs: ["name"],
        optionalInputs: ["title", "company", "linkedinUrl"],
        outputs: ["shortBio"],
        costCents: 0,
        tier: "cheap",
        priority: 7,
        canFail: true,
    },
];

// ============================================================
// REGISTRY
// ============================================================

/**
 * All tools in the registry.
 */
export const TOOL_REGISTRY: ToolDefinition[] = [
    ...COMPANY_TOOLS,
    ...PERSON_TOOLS,
];

/**
 * Get tool by ID.
 */
export function getToolById(id: string): ToolDefinition | undefined {
    return TOOL_REGISTRY.find(t => t.id === id);
}

/**
 * Get tools for an entity type.
 */
export function getToolsForEntityType(entityType: EntityType): ToolDefinition[] {
    return TOOL_REGISTRY.filter(t => t.entityTypes.includes(entityType));
}

/**
 * Get tools for a strategy.
 */
export function getToolsForStrategy(strategy: EnrichmentStrategy): ToolDefinition[] {
    return TOOL_REGISTRY.filter(t => t.strategies.includes(strategy));
}

/**
 * Get tools that match both entity type and strategy.
 */
export function getMatchingTools(
    entityType: EntityType,
    strategy: EnrichmentStrategy
): ToolDefinition[] {
    return TOOL_REGISTRY.filter(
        t => t.entityTypes.includes(entityType) && t.strategies.includes(strategy)
    ).sort((a, b) => a.priority - b.priority);
}

/**
 * Get tools that can provide a specific output field.
 */
export function getToolsForOutput(field: string): ToolDefinition[] {
    return TOOL_REGISTRY.filter(t => t.outputs.includes(field));
}

/**
 * Check if tool requirements are satisfied by available inputs.
 */
export function canRunTool(
    tool: ToolDefinition,
    availableInputs: string[]
): { canRun: boolean; missing: string[] } {
    const available = new Set(availableInputs);
    const missing = tool.requiredInputs.filter(input => !available.has(input));
    return { canRun: missing.length === 0, missing };
}

/**
 * Calculate total cost for a set of tools.
 */
export function calculateTotalCost(toolIds: string[]): number {
    return toolIds.reduce((sum, id) => {
        const tool = getToolById(id);
        return sum + (tool?.costCents ?? 0);
    }, 0);
}
