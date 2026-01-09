/**
 * Mock profile generator for testing purposes
 * Generates a mock profile based on a URL
 */

import { ResolvedProfile } from '../types/icp';

export function generateMockProfile(url: string): ResolvedProfile {
    // Extract handle from URL for demo purposes
    const handle = url.split('/').pop() || 'unknown';

    return {
        source: 'linkedin',
        handle,
        profileUrl: `https://www.linkedin.com/in/${handle}`,
        name: `Mock User ${handle}`,
        headline: 'Software Engineer at Mock Company',
        location: 'San Francisco, CA',
        scrapeNote: 'mock profile generated'
    };
}
