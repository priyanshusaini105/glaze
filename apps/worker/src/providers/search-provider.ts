/**
 * Search Service Provider
 * 
 * Placeholder for search service logic
 * Will be moved/copied from apps/api/src/services/search-service.ts
 */

export interface SearchProviderConfig {
  apiKey?: string;
}

export const createSearchProvider = (config?: SearchProviderConfig) => {
  return {
    search: async (query: string) => {
      // TODO: Implement search functionality
      throw new Error("Not implemented yet");
    },
  };
};
