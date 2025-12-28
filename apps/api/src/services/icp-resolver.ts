import { ResolveProfileResponse } from '../types/icp';
import { parseProfileUrl } from '../utils/profile-url';
import { scrapeLinkedInProfile } from './linkedin-scraper';
import { generateMockProfile } from './mock-profile-generator';

export type ResolveProfileOptions = {
  mock?: boolean;
  mockDelay?: number;
};

export const resolveProfile = async (
  url: string,
  options?: ResolveProfileOptions
): Promise<ResolveProfileResponse> => {
  if (options?.mock) {
    if (options.mockDelay) {
      await new Promise((resolve) => setTimeout(resolve, options.mockDelay));
    }
    return {
      profile: generateMockProfile(url)
    };
  }

  const profile = parseProfileUrl(url);

  if (profile.source === 'linkedin') {
    try {
      const scraped = await scrapeLinkedInProfile(profile.handle);

      profile.name = scraped.name ?? profile.name ?? null;
      profile.headline = scraped.headline ?? null;
      profile.location = scraped.location ?? null;
      profile.scrapeNote = 'linkedin scrape ok';
    } catch (err) {
      profile.name = profile.name ?? null;
      profile.headline = profile.headline ?? null;
      profile.location = profile.location ?? null;
      profile.scrapeNote = 'linkedin scrape failed';
    }
  }

  return {
    profile
  };
};
