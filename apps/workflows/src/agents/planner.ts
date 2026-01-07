/**
 * Planner Agent
 * 
 * Decides which fields are missing, which tools to call, and budget allocation.
 * No external calls - pure planning logic.
 * 
 * Responsibilities:
 * - Field diff analysis
 * - Budget allocation
 * - Task prioritization
 * - Tool selection based on entity type
 */

import { logger } from "@trigger.dev/sdk";
import type {
    EnrichmentFieldKey,
    EnrichmentPlan,
    PlanStep,
    NormalizedInput,
    ProviderTier,
} from "../types/enrichment";
import { resolveIdentity, getRecommendedTools, type EntityIdentity } from "../tools/identity-resolver";
import { providers } from "../tools/providers";

/**
 * Budget allocation for different tiers
 */
interface BudgetAllocation {
    free: number;
    cheap: number;
    premium: number;
    total: number;
    remaining: number;
}

/**
 * Planning context with all relevant information
 */
interface PlanningContext {
    input: NormalizedInput;
    fieldsToEnrich: EnrichmentFieldKey[];
    existingData: Record<string, unknown>;
    identity: EntityIdentity;
    budget: BudgetAllocation;
}

/**
 * Field dependencies - some fields should be enriched before others
 */
const FIELD_DEPENDENCIES: Partial<Record<EnrichmentFieldKey, EnrichmentFieldKey[]>> = {
    emailCandidates: ['name', 'company'], // Need name + domain for email patterns
    shortBio: ['name', 'title'], // Bio is better with name and title
    companySummary: ['company'], // Need company name first
};

/**
 * Field priorities (lower = higher priority)
 */
const FIELD_PRIORITY: Partial<Record<EnrichmentFieldKey, number>> = {
    name: 1,
    company: 1,
    title: 2,
    location: 3,
    socialLinks: 3,
    shortBio: 4,
    emailCandidates: 5,
    companySize: 4,
    companySummary: 5,
    techStack: 6,
    funding: 6,
    foundedDate: 6,
    whois: 7,
};

/**
 * Tool to field mapping
 */
const TOOL_FIELD_SUPPORT: Record<string, EnrichmentFieldKey[]> = {
    serper: ['name', 'title', 'company', 'socialLinks', 'location', 'shortBio'],
    linkedin_api: ['name', 'title', 'company', 'shortBio', 'location', 'socialLinks', 'companySize', 'companySummary'],
    github: ['name', 'shortBio', 'company', 'location', 'socialLinks'],
    company_scraper: ['company', 'companySummary', 'socialLinks', 'location', 'foundedDate'],
    email_pattern: ['emailCandidates'],
    email_verifier: ['emailCandidates'],
    llm_synthesizer: ['shortBio', 'companySummary'],
};

/**
 * Tool costs (cents)
 */
const TOOL_COSTS: Record<string, number> = {
    serper: 1,
    linkedin_api: 3,
    github: 0,
    company_scraper: 0,
    email_pattern: 0,
    email_verifier: 1,
    llm_synthesizer: 0.5,
};

/**
 * Tool tiers
 */
const TOOL_TIERS: Record<string, ProviderTier> = {
    serper: 'free',
    github: 'free',
    company_scraper: 'free',
    email_pattern: 'free',
    linkedin_api: 'premium',
    email_verifier: 'cheap',
    llm_synthesizer: 'cheap',
};

/**
 * Allocate budget across tiers
 */
function allocateBudget(totalCents: number): BudgetAllocation {
    return {
        free: Infinity, // No limit on free tools
        cheap: Math.floor(totalCents * 0.4), // 40% for cheap
        premium: Math.floor(totalCents * 0.6), // 60% for premium
        total: totalCents,
        remaining: totalCents,
    };
}

/**
 * Check which fields already have values in the input
 */
function getExistingFields(input: NormalizedInput): Set<EnrichmentFieldKey> {
    const existing = new Set<EnrichmentFieldKey>();
    
    if (input.name) existing.add('name');
    if (input.domain) existing.add('company'); // Domain implies we have company info
    if (input.company) existing.add('company');
    if (input.linkedinUrl) existing.add('socialLinks');
    if (input.email) existing.add('emailCandidates');
    
    // Check raw data for additional fields
    const raw = input.raw as Record<string, unknown>;
    for (const [key, value] of Object.entries(raw)) {
        if (value !== null && value !== undefined && value !== '') {
            if (FIELD_PRIORITY[key as EnrichmentFieldKey] !== undefined) {
                existing.add(key as EnrichmentFieldKey);
            }
        }
    }
    
    return existing;
}

/**
 * Get missing fields that need enrichment
 */
function getMissingFields(
    fieldsToEnrich: EnrichmentFieldKey[],
    existingFields: Set<EnrichmentFieldKey>
): EnrichmentFieldKey[] {
    return fieldsToEnrich.filter(f => !existingFields.has(f));
}

/**
 * Sort fields by priority and dependencies
 */
function sortFieldsByPriority(
    fields: EnrichmentFieldKey[],
    existingFields: Set<EnrichmentFieldKey>
): EnrichmentFieldKey[] {
    return [...fields].sort((a, b) => {
        // Check dependencies
        const aDeps = FIELD_DEPENDENCIES[a] ?? [];
        const bDeps = FIELD_DEPENDENCIES[b] ?? [];
        
        // If a depends on b, b should come first
        if (aDeps.includes(b)) return 1;
        if (bDeps.includes(a)) return -1;
        
        // Check if dependencies are met
        const aDepsMet = aDeps.every(d => existingFields.has(d) || fields.includes(d));
        const bDepsMet = bDeps.every(d => existingFields.has(d) || fields.includes(d));
        
        if (!aDepsMet && bDepsMet) return 1;
        if (aDepsMet && !bDepsMet) return -1;
        
        // Sort by priority
        const aPriority = FIELD_PRIORITY[a] ?? 5;
        const bPriority = FIELD_PRIORITY[b] ?? 5;
        
        return aPriority - bPriority;
    });
}

/**
 * Select best tool for a field based on context
 */
function selectToolForField(
    field: EnrichmentFieldKey,
    context: PlanningContext,
    usedTools: Set<string>
): { tool: string; priority: 'high' | 'medium' | 'low'; costCents: number } | null {
    // Get tools that can enrich this field
    const capableTools = Object.entries(TOOL_FIELD_SUPPORT)
        .filter(([_, fields]) => fields.includes(field))
        .map(([tool]) => tool);
    
    if (capableTools.length === 0) {
        return null;
    }
    
    // Sort by tier (free first, then cheap, then premium)
    const tierOrder: ProviderTier[] = ['free', 'cheap', 'premium'];
    capableTools.sort((a, b) => {
        const aTier = TOOL_TIERS[a] ?? 'premium';
        const bTier = TOOL_TIERS[b] ?? 'premium';
        return tierOrder.indexOf(aTier) - tierOrder.indexOf(bTier);
    });
    
    // Special case: if we have LinkedIn URL, prioritize LinkedIn provider
    if (context.input.linkedinUrl && capableTools.includes('linkedin_api')) {
        const cost = TOOL_COSTS.linkedin_api ?? 3;
        if (context.budget.remaining >= cost) {
            return { tool: 'linkedin_api', priority: 'high', costCents: cost };
        }
    }
    
    // Find first tool we can afford
    for (const tool of capableTools) {
        const cost = TOOL_COSTS[tool] ?? 0;
        const tier = TOOL_TIERS[tool] ?? 'premium';
        
        // Check budget
        if (tier !== 'free' && context.budget.remaining < cost) {
            continue;
        }
        
        // Prefer tools we haven't used yet for variety
        const priority: 'high' | 'medium' | 'low' = usedTools.has(tool) ? 'low' : 'medium';
        
        return { tool, priority, costCents: cost };
    }
    
    return null;
}

/**
 * Generate an enrichment plan
 */
export async function generatePlan(
    input: NormalizedInput,
    fieldsToEnrich: EnrichmentFieldKey[],
    budgetCents: number = 100
): Promise<EnrichmentPlan> {
    logger.info("🧠 Planner: Generating plan", {
        rowId: input.rowId,
        fieldsToEnrich,
        budgetCents,
    });
    
    // Resolve identity first
    const identity = await resolveIdentity(input, fieldsToEnrich);
    
    // Initialize planning context
    const context: PlanningContext = {
        input,
        fieldsToEnrich,
        existingData: input.raw,
        identity,
        budget: allocateBudget(budgetCents),
    };
    
    // Get existing and missing fields
    const existingFields = getExistingFields(input);
    const missingFields = getMissingFields(fieldsToEnrich, existingFields);
    
    if (missingFields.length === 0) {
        logger.info("✅ Planner: All fields already exist", {
            rowId: input.rowId,
            existingFields: [...existingFields],
        });
        return { plan: [], maxCostCents: budgetCents, notes: "All requested fields already have values" };
    }
    
    // Sort by priority
    const sortedFields = sortFieldsByPriority(missingFields, existingFields);
    
    // Generate plan steps
    const steps: PlanStep[] = [];
    const usedTools = new Set<string>();
    let totalCost = 0;
    
    for (const field of sortedFields) {
        const selection = selectToolForField(field, context, usedTools);
        
        if (!selection) {
            logger.debug("⚠️ Planner: No tool available for field", { field });
            continue;
        }
        
        // Deduct from budget
        context.budget.remaining -= selection.costCents;
        totalCost += selection.costCents;
        usedTools.add(selection.tool);
        
        steps.push({
            step: steps.length + 1,
            tool: selection.tool,
            field,
            priority: selection.priority,
            maxCostCents: selection.costCents,
        });
    }
    
    // Add LLM synthesis steps at the end if we have source data
    const synthesisFields: EnrichmentFieldKey[] = ['shortBio', 'companySummary'];
    for (const field of synthesisFields) {
        if (fieldsToEnrich.includes(field) && !existingFields.has(field)) {
            // Check if we'll have enough source data
            const hasSources = steps.some(s => 
                s.field === 'name' || s.field === 'title' || s.field === 'company'
            );
            
            if (hasSources && context.budget.remaining >= 0.5) {
                steps.push({
                    step: steps.length + 1,
                    tool: 'llm_synthesizer',
                    field,
                    priority: 'low',
                    maxCostCents: 0.5,
                });
                context.budget.remaining -= 0.5;
                totalCost += 0.5;
            }
        }
    }
    
    const plan: EnrichmentPlan = {
        plan: steps,
        maxCostCents: budgetCents,
        notes: `Entity type: ${identity.entityType}, Confidence: ${identity.confidence}. ` +
               `${steps.length} steps planned, estimated cost: ${totalCost.toFixed(1)}¢`,
    };
    
    logger.info("✅ Planner: Plan generated", {
        rowId: input.rowId,
        steps: steps.length,
        estimatedCost: totalCost,
        entityType: identity.entityType,
    });
    
    return plan;
}

/**
 * Get field diff between existing and requested
 */
export function getFieldDiff(
    input: NormalizedInput,
    fieldsToEnrich: EnrichmentFieldKey[]
): { existing: EnrichmentFieldKey[]; missing: EnrichmentFieldKey[] } {
    const existingSet = getExistingFields(input);
    
    return {
        existing: fieldsToEnrich.filter(f => existingSet.has(f)),
        missing: fieldsToEnrich.filter(f => !existingSet.has(f)),
    };
}

/**
 * Estimate cost for a plan
 */
export function estimatePlanCost(plan: EnrichmentPlan): number {
    return plan.plan.reduce((sum, step) => sum + (step.maxCostCents ?? 0), 0);
}

/**
 * Check if budget is sufficient for a plan
 */
export function isBudgetSufficient(plan: EnrichmentPlan, budgetCents: number): boolean {
    return estimatePlanCost(plan) <= budgetCents;
}
