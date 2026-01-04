/**
 * LinkedIn Provider Adapter
 * 
 * Placeholder for LinkedIn provider logic
 * Will be moved/copied from apps/api/src/services/linkedin-provider.ts
 */

export interface LinkedInProviderConfig {
  apiKey?: string;
  enableScraping?: boolean;
}

export const createLinkedInProvider = (config: LinkedInProviderConfig) => {
  return {
    getProfile: async (url: string) => {
      // TODO: Implement LinkedIn profile fetching
      throw new Error("Not implemented yet");
    },
    getCompany: async (url: string) => {
      // TODO: Implement LinkedIn company fetching
      throw new Error("Not implemented yet");
    },
  };
};
