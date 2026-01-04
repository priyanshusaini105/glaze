/**
 * Website Scraper Provider
 * 
 * Placeholder for website scraping logic
 * Will be moved/copied from apps/api/src/services/website-scraper.ts
 */

export interface ScraperConfig {
  timeout?: number;
  retries?: number;
}

export const createScraperProvider = (config?: ScraperConfig) => {
  return {
    scrapeWebsite: async (url: string) => {
      // TODO: Implement website scraping
      throw new Error("Not implemented yet");
    },
  };
};
