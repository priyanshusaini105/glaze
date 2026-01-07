/**
 * Tool Executor
 * 
 * Maps tool IDs from the registry to actual executable implementations.
 * This bridges the gap between the static tool definitions and the actual code.
 */

import { logger } from "@trigger.dev/sdk";
import type { NormalizedInput } from "@/types/enrichment";
import type { ToolDefinition } from "./tool-registry";
import { getToolById } from "./tool-registry";
import { resolveCompanyIdentityFromName } from "@/tools/company/resolve-company-identity-from-name";
import { resolveCompanyIdentityFromDomain } from "@/tools/company/resolve-company-identity-from-domain";

/**
 * Result from tool execution
 */
export interface ToolExecutionResult {
  [field: string]: unknown;
}

/**
 * Extended tool definition with execute method
 */
export interface ExecutableTool extends ToolDefinition {
  execute: (
    input: NormalizedInput,
    existingData: Record<string, unknown>
  ) => Promise<ToolExecutionResult>;
}

/**
 * Create executable tool from tool definition
 */
export function createExecutableTool(tool: ToolDefinition): ExecutableTool {
  return {
    ...tool,
    execute: async (input: NormalizedInput, existingData: Record<string, unknown>) => {
      logger.info(`🔧 Executing tool: ${tool.name}`, {
        toolId: tool.id,
        inputs: {
          name: input.name,
          company: input.company,
          domain: input.domain,
          email: input.email,
          linkedinUrl: input.linkedinUrl,
        },
      });

      try {
        return await executeToolById(tool.id, input, existingData);
      } catch (error) {
        logger.error(`❌ Tool execution failed: ${tool.name}`, {
          toolId: tool.id,
          error: error instanceof Error ? error.message : String(error),
        });
        
        // Return empty result on error
        return {};
      }
    },
  };
}

/**
 * Execute tool by ID
 */
async function executeToolById(
  toolId: string,
  input: NormalizedInput,
  existingData: Record<string, unknown>
): Promise<ToolExecutionResult> {
  switch (toolId) {
    // ============ COMPANY TOOLS ============
    
    case "resolve_company_from_domain": {
      const domain = input.domain || existingData.domain as string | undefined;
      if (!domain) {
        logger.warn("Missing required input: domain");
        return {};
      }
      
      const result = await resolveCompanyIdentityFromDomain(domain);
      
      return {
        company: result.companyName,
        domain: result.canonicalDomain,
        website: result.websiteUrl,
        _status: result.status,
      };
    }

    case "resolve_company_from_name": {
      const company = input.company || existingData.company as string | undefined;
      if (!company) {
        logger.warn("Missing required input: company");
        return {};
      }
      
      const result = await resolveCompanyIdentityFromName(company);
      
      return {
        company: result.canonicalCompanyName,
        domain: result.domain,
        website: result.websiteUrl,
        _confidence: result.confidence,
      };
    }

    case "fetch_company_profile": {
      // TODO: Implement company profile fetcher
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "estimate_company_size": {
      // TODO: Implement company size estimator
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "detect_tech_stack": {
      // TODO: Implement tech stack detector
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "serper_company_search": {
      // TODO: Implement Serper company search
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "company_summarizer": {
      // TODO: Implement company summarizer
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    // ============ PERSON TOOLS ============

    case "resolve_person_from_linkedin": {
      // TODO: Implement LinkedIn person resolver
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "resolve_person_from_name_company": {
      // TODO: Implement name+company person resolver
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "serper_person_search": {
      // TODO: Implement Serper person search
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "email_pattern_inference": {
      // TODO: Implement email pattern inference
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "email_verifier": {
      // TODO: Implement email verifier
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "github_profile": {
      // TODO: Implement GitHub profile fetcher
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    case "bio_synthesizer": {
      // TODO: Implement bio synthesizer
      logger.warn("Tool not yet implemented", { toolId });
      return {};
    }

    default:
      logger.error("Unknown tool ID", { toolId });
      return {};
  }
}

/**
 * Get executable tool by ID
 */
export function getExecutableToolById(toolId: string): ExecutableTool | undefined {
  const tool = getToolById(toolId);
  
  if (!tool) {
    return undefined;
  }
  
  return createExecutableTool(tool);
}
