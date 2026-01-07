/**
 * Tool Registry System
 * 
 * Provides automatic tool discovery and registration for the enrichment system.
 * Tools can be added by simply creating a new file in the tools/providers directory.
 * 
 * @example Adding a new tool:
 * 
 * ```typescript
 * // Create file: tools/providers/my-new-provider.ts
 * import { defineProvider } from '../registry';
 * 
 * export const myNewProvider = defineProvider({
 *   name: 'my-new-provider',
 *   description: 'My new enrichment provider',
 *   costMultiplier: 1.0,
 *   supportedFields: ['email', 'company'],
 *   execute: async (input, context) => {
 *     // Implementation
 *     return { email: 'test@example.com' };
 *   }
 * });
 * ```
 */

import type { EnrichmentFieldKey, NormalizedInput, ProviderResult } from '@/types/enrichment';

export interface ProviderDefinition {
  /** Unique provider name */
  name: string;
  /** Human-readable description */
  description: string;
  /** Cost multiplier (0 = free, 1 = normal, 2 = expensive) */
  costMultiplier: number;
  /** Fields this provider can enrich */
  supportedFields: EnrichmentFieldKey[];
  /** Required input fields */
  requiredInputs?: ('linkedinUrl' | 'domain' | 'email' | 'name' | 'company')[];
  /** Provider execution function */
  execute: (
    input: NormalizedInput,
    context: ExecutionContext
  ) => Promise<Record<string, unknown>>;
  /** Optional validation function */
  validate?: (input: NormalizedInput) => boolean;
  /** Rate limit info (requests per second) */
  rateLimit?: number;
}

export interface ExecutionContext {
  budgetCents: number;
  existingData?: Record<string, unknown>;
  signal?: AbortSignal;
}

class ToolRegistry {
  private providers: Map<string, ProviderDefinition> = new Map();
  private byField: Map<EnrichmentFieldKey, ProviderDefinition[]> = new Map();

  /**
   * Register a provider
   */
  register(provider: ProviderDefinition): void {
    this.providers.set(provider.name, provider);
    
    // Index by supported fields
    for (const field of provider.supportedFields) {
      if (!this.byField.has(field)) {
        this.byField.set(field, []);
      }
      this.byField.get(field)!.push(provider);
    }
  }

  /**
   * Get provider by name
   */
  get(name: string): ProviderDefinition | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all providers
   */
  getAll(): ProviderDefinition[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers that can enrich a specific field
   */
  getByField(field: EnrichmentFieldKey): ProviderDefinition[] {
    return this.byField.get(field) || [];
  }

  /**
   * Get providers sorted by cost (cheapest first)
   */
  getByCost(field: EnrichmentFieldKey): ProviderDefinition[] {
    const providers = this.getByField(field);
    return providers.sort((a, b) => a.costMultiplier - b.costMultiplier);
  }

  /**
   * Get providers that can handle the given input
   */
  getCompatible(input: NormalizedInput): ProviderDefinition[] {
    return this.getAll().filter(provider => {
      // Check required inputs
      if (provider.requiredInputs) {
        return provider.requiredInputs.some(req => input[req]);
      }
      
      // Check validation function
      if (provider.validate) {
        return provider.validate(input);
      }
      
      return true;
    });
  }

  /**
   * Clear all registered providers (useful for testing)
   */
  clear(): void {
    this.providers.clear();
    this.byField.clear();
  }
}

// Global registry instance
const registry = new ToolRegistry();

/**
 * Helper function to define a provider
 */
export function defineProvider(definition: ProviderDefinition): ProviderDefinition {
  registry.register(definition);
  return definition;
}

/**
 * Get the global registry
 */
export function getRegistry(): ToolRegistry {
  return registry;
}

export default registry;
