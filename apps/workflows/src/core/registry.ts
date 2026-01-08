/**
 * Core Registry
 * 
 * Central registry for providers, plans, and enrichment strategies.
 */

import { logger } from "@trigger.dev/sdk";

type RegistryItem = {
  id: string;
  type: 'provider' | 'plan' | 'strategy';
  data: unknown;
};

class Registry {
  private items: Map<string, RegistryItem> = new Map();

  register(item: RegistryItem) {
    this.items.set(item.id, item);
    logger.info(`📝 Registered ${item.type}: ${item.id}`);
  }

  get(id: string): RegistryItem | undefined {
    return this.items.get(id);
  }

  getAll(type?: string): RegistryItem[] {
    if (!type) {
      return Array.from(this.items.values());
    }
    return Array.from(this.items.values()).filter(item => item.type === type);
  }

  has(id: string): boolean {
    return this.items.has(id);
  }

  clear() {
    this.items.clear();
  }
}

export const registry = new Registry();
