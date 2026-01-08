/**
 * Providers Auto-Registration
 * 
 * This file automatically imports and registers all providers.
 * To add a new provider, simply create a file in this directory
 * and import it here.
 */

import '@/plans'; // Register plans first

// Free providers (0x cost)
import './github-provider';
import './wikipedia-provider';
import './opencorporates-provider';
import './company-scraper';

// Cheap providers (1-2x cost)
import './serper-provider';
import './prospeo-provider';

// Premium providers (3x+ cost)
import './linkedin-provider';

// Mock providers (for testing)
// These are conditionally registered based on config
import './mock-github';
import './mock-hunter';
import './mock-linkedin';
import './mock-opencorporates';

/**
 * Legacy exports for backward compatibility
 * 
 * @deprecated Use getRegistry() from '@/core' instead
 */
export { serperProvider } from './serper-provider';
export { linkedInProvider } from './linkedin-provider';
export { githubProvider } from './github-provider';
export { companyScraperProvider } from './company-scraper';
export { wikipediaProvider } from './wikipedia-provider';
export { openCorporatesProvider } from './opencorporates-provider';
export { prospeoProvider } from './prospeo-provider';

// Legacy helper functions
import { registry } from '@/core/registry';

/**
 * @deprecated Use registry.get(name) instead
 */
export function getProviderByName(name: string) {
  return getRegistry().get(name);
}

/**
 * @deprecated Use getRegistry().getByField(field) instead
 */
export function getProvidersForField(field: string) {
  return getRegistry().getByField(field as any);
}

/**
 * @deprecated Use getRegistry().getAll() instead
 */
export function getAllProviders() {
  return getRegistry().getAll();
}

/**
 * @deprecated Use getRegistry().getAll().map(p => ({name, description})) instead
 */
export function getAllProviderDescriptions() {
  return getRegistry().getAll().map(p => ({
    name: p.name,
    description: p.description,
    costMultiplier: p.costMultiplier,
    supportedFields: p.supportedFields,
  }));
}
