/**
 * LinkedIn Provider Adapters for Enrichment Pipeline
 * 
 * Adapts LinkedIn API to EnrichmentProvider interface
 * Maps LinkedIn data structures to enrichment fields
 */

import { Effect } from 'effect';
import {
  getLinkedInProfile,
  getLinkedInCompany,
  LinkedInAPIServiceLive,
} from './effect-linkedin';
import type { LinkedInProfile, LinkedInCompany } from '../types/linkedin';
import type { EnrichmentData, EnrichedValue, EnrichmentField } from '../types/enrichment';
import { ProviderError, type EnrichmentProvider } from './effect-enrichment';

// ========== Field Mapping Utilities ==========

/**
 * Map LinkedIn profile data to enrichment fields
 */
export const mapLinkedInProfileToEnrichment = (
  profile: LinkedInProfile
): EnrichmentData => {
  const timestamp = new Date().toISOString();
  const data: EnrichmentData = {};

  // Person name
  if (profile.full_name) {
    data.person_name = {
      value: profile.full_name,
      confidence: 95,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Person title/headline
  if (profile.headline) {
    data.person_title = {
      value: profile.headline,
      confidence: 90,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Person location
  if (profile.location) {
    const locationStr = [profile.location.city, profile.location.country]
      .filter(Boolean)
      .join(', ');
    
    if (locationStr) {
      data.person_location = {
        value: locationStr,
        confidence: 95,
        source: 'linkedin_api',
        timestamp,
      };
    }
  }

  // Person LinkedIn URL
  if (profile.profile_url) {
    data.person_linkedin = {
      value: profile.profile_url,
      confidence: 100,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Person company (from current experience)
  if (profile.experience && profile.experience.length > 0) {
    const currentJob = profile.experience[0]; // Most recent
    
    if (currentJob.company) {
      data.person_company = {
        value: currentJob.company,
        confidence: 90,
        source: 'linkedin_api',
        timestamp,
      };
    }
  }

  // Extract company info from experience if available
  if (profile.experience && profile.experience.length > 0) {
    const currentJob = profile.experience[0];
    
    // Try to extract company name
    if (currentJob.company && !data.company_name) {
      data.company_name = {
        value: currentJob.company,
        confidence: 85,
        source: 'linkedin_api',
        timestamp,
      };
    }
  }

  return data;
};

/**
 * Map LinkedIn company data to enrichment fields
 */
export const mapLinkedInCompanyToEnrichment = (
  company: LinkedInCompany
): EnrichmentData => {
  const timestamp = new Date().toISOString();
  const data: EnrichmentData = {};

  // Company name
  if (company.company_name) {
    data.company_name = {
      value: company.company_name,
      confidence: 100,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Company description
  if (company.about) {
    data.company_description = {
      value: company.about,
      confidence: 95,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Company website
  if (company.website) {
    data.company_website = {
      value: company.website,
      confidence: 100,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Company location
  if (company.location) {
    data.company_hq_location = {
      value: company.location,
      confidence: 95,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Employee count
  if (company.employee_count) {
    data.company_employee_count = {
      value: company.employee_count,
      confidence: 90,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Industry
  if (company.industry) {
    data.company_industry = {
      value: company.industry,
      confidence: 95,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // Founded year
  if (company.founded_year) {
    data.company_founded_year = {
      value: company.founded_year,
      confidence: 90,
      source: 'linkedin_api',
      timestamp,
    };
  }

  // LinkedIn URL
  if (company.company_url) {
    data.company_linkedin = {
      value: company.company_url,
      confidence: 100,
      source: 'linkedin_api',
      timestamp,
    };
  }

  return data;
};

// ========== Provider Adapters ==========

/**
 * LinkedIn Profile Provider
 * Cost: ~10 cents per lookup
 */
export const LinkedInProfileProvider: EnrichmentProvider = {
  name: 'LinkedInProfile',
  costCents: 10,
  
  lookup: (url: string) =>
    Effect.gen(function* (_) {
      yield* _(Effect.log(`[LinkedIn Provider] Fetching profile: ${url}`));

      // Call LinkedIn API
      const profile = yield* _(
        Effect.provide(
          getLinkedInProfile(url),
          LinkedInAPIServiceLive
        ),
        Effect.mapError((error) => 
          new ProviderError(
            'LinkedInProfile',
            `LinkedIn API error: ${error._tag === 'LinkedInAPIError' ? error.message : 'Unknown error'}`,
            error
          )
        )
      );

      // Map to enrichment format
      const enrichmentData = mapLinkedInProfileToEnrichment(profile);
      
      yield* _(
        Effect.log(
          `[LinkedIn Provider] Profile enriched: ${Object.keys(enrichmentData).length} fields`
        )
      );

      // Convert to Record<string, unknown> for provider interface
      return Object.fromEntries(
        Object.entries(enrichmentData).map(([key, value]) => [key, value])
      ) as Record<string, unknown>;
    }),
};

/**
 * LinkedIn Company Provider
 * Cost: ~10 cents per lookup
 */
export const LinkedInCompanyProvider: EnrichmentProvider = {
  name: 'LinkedInCompany',
  costCents: 10,
  
  lookup: (url: string) =>
    Effect.gen(function* (_) {
      yield* _(Effect.log(`[LinkedIn Provider] Fetching company: ${url}`));

      // Call LinkedIn API
      const company = yield* _(
        Effect.provide(
          getLinkedInCompany(url),
          LinkedInAPIServiceLive
        ),
        Effect.mapError((error) =>
          new ProviderError(
            'LinkedInCompany',
            `LinkedIn API error: ${error._tag === 'LinkedInAPIError' ? error.message : 'Unknown error'}`,
            error
          )
        )
      );

      // Map to enrichment format
      const enrichmentData = mapLinkedInCompanyToEnrichment(company);
      
      yield* _(
        Effect.log(
          `[LinkedIn Provider] Company enriched: ${Object.keys(enrichmentData).length} fields`
        )
      );

      // Convert to Record<string, unknown> for provider interface
      return Object.fromEntries(
        Object.entries(enrichmentData).map(([key, value]) => [key, value])
      ) as Record<string, unknown>;
    }),
};

// ========== Helper Functions ==========

/**
 * Detect if a URL is a LinkedIn profile or company page
 */
export const detectLinkedInUrlType = (
  url: string
): 'profile' | 'company' | null => {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('linkedin.com/in/')) {
    return 'profile';
  }
  
  if (lowerUrl.includes('linkedin.com/company/')) {
    return 'company';
  }
  
  return null;
};

/**
 * Extract LinkedIn URL from enrichment data
 */
export const extractLinkedInUrl = (
  data: EnrichmentData
): { url: string; type: 'profile' | 'company' } | null => {
  // Check for person LinkedIn URL
  if (data.person_linkedin?.value) {
    const url = String(data.person_linkedin.value);
    if (detectLinkedInUrlType(url) === 'profile') {
      return { url, type: 'profile' };
    }
  }

  // Check for company LinkedIn URL
  if (data.company_linkedin?.value) {
    const url = String(data.company_linkedin.value);
    if (detectLinkedInUrlType(url) === 'company') {
      return { url, type: 'company' };
    }
  }

  return null;
};

/**
 * Determine which fields can be enriched by LinkedIn providers
 */
export const getLinkedInEnrichableFields = (
  type: 'profile' | 'company'
): EnrichmentField[] => {
  if (type === 'profile') {
    return [
      'person_name',
      'person_title',
      'person_location',
      'person_linkedin',
      'person_company',
      'company_name', // Can extract from current job
    ];
  }

  // type === 'company'
  return [
    'company_name',
    'company_description',
    'company_website',
    'company_hq_location',
    'company_employee_count',
    'company_industry',
    'company_founded_year',
    'company_linkedin',
  ];
};

/**
 * Check if LinkedIn provider should be used based on gaps and budget
 */
export const shouldUseLinkedInProvider = (params: {
  gaps: EnrichmentField[];
  remainingBudgetCents: number;
  linkedInUrl: string | null;
  linkedInType: 'profile' | 'company' | null;
}): { shouldUse: boolean; reason: string } => {
  const { gaps, remainingBudgetCents, linkedInUrl, linkedInType } = params;

  // No LinkedIn URL detected
  if (!linkedInUrl || !linkedInType) {
    return {
      shouldUse: false,
      reason: 'No LinkedIn URL detected',
    };
  }

  // Insufficient budget
  if (remainingBudgetCents < 10) {
    return {
      shouldUse: false,
      reason: `Insufficient budget (${remainingBudgetCents}¢ < 10¢)`,
    };
  }

  // Check if any gaps can be filled by LinkedIn
  const enrichableFields = getLinkedInEnrichableFields(linkedInType);
  const relevantGaps = gaps.filter((gap) => enrichableFields.includes(gap));

  if (relevantGaps.length === 0) {
    return {
      shouldUse: false,
      reason: 'No relevant gaps for LinkedIn provider',
    };
  }

  return {
    shouldUse: true,
    reason: `Can fill ${relevantGaps.length} gaps: ${relevantGaps.join(', ')}`,
  };
};
