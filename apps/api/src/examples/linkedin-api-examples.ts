/**
 * LinkedIn API Usage Examples
 * 
 * Demonstrates how to use the Effect TS LinkedIn API service
 */

import { Effect, Console } from 'effect';
import {
  LinkedInAPIServiceLive,
  getLinkedInProfile,
  getLinkedInCompany,
  searchLinkedInPeople,
  searchLinkedInJobs,
} from '../services/effect-linkedin';

// ========== Example 1: Get Profile Data ==========

export const exampleGetProfile = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Fetching LinkedIn Profile ==='));

    const profile = yield* _(
      getLinkedInProfile('https://www.linkedin.com/in/williamhgates')
    );

    yield* _(Console.log('Profile retrieved:', profile));

    return profile;
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Example 2: Get Company Data ==========

export const exampleGetCompany = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Fetching LinkedIn Company ==='));

    const company = yield* _(
      getLinkedInCompany('https://www.linkedin.com/company/microsoft')
    );

    yield* _(Console.log('Company retrieved:', company));

    return company;
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Example 3: Search People ==========

export const exampleSearchPeople = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Searching LinkedIn Profiles ==='));

    const results = yield* _(
      searchLinkedInPeople('Software Engineer', {
        location: 'San Francisco',
        company: 'Google',
        limit: 10,
      })
    );

    yield* _(Console.log(`Found ${results.length} profiles:`, results));

    return results;
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Example 4: Search Jobs ==========

export const exampleSearchJobs = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Searching LinkedIn Jobs ==='));

    const results = yield* _(
      searchLinkedInJobs('TypeScript Developer', {
        location: 'Remote',
        limit: 10,
      })
    );

    yield* _(Console.log(`Found ${results.length} jobs:`, results));

    return results;
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Example 5: Error Handling ==========

export const exampleErrorHandling = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Error Handling Example ==='));

    const result = yield* _(
      getLinkedInProfile('https://www.linkedin.com/in/invalid-profile-url'),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          yield* _(Console.error('Error caught:', error));

          // Return fallback data
          return {
            full_name: 'Unknown',
            headline: 'Profile not found',
            location: { country: '', city: '' },
            experience: [],
            skills: [],
            education: [],
            profile_url: '',
          };
        })
      )
    );

    yield* _(Console.log('Result (with fallback):', result));

    return result;
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Example 6: Batch Processing ==========

export const exampleBatchProcessing = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Batch Processing Multiple Profiles ==='));

    const profileUrls = [
      'https://www.linkedin.com/in/williamhgates',
      'https://www.linkedin.com/in/satyanadella',
      'https://www.linkedin.com/in/jeffweiner08',
    ];

    // Process sequentially to respect rate limits
    const profiles = yield* _(
      Effect.forEach(
        profileUrls,
        (url) =>
          Effect.gen(function* (_) {
            yield* _(Console.log(`Processing: ${url}`));
            return yield* _(getLinkedInProfile(url));
          }),
        { concurrency: 1 } // Sequential processing
      )
    );

    yield* _(Console.log(`Processed ${profiles.length} profiles`));

    return profiles;
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Example 7: Timeout Handling ==========

export const exampleWithTimeout = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Profile Fetch with Timeout ==='));

    const profile = yield* _(
      getLinkedInProfile('https://www.linkedin.com/in/williamhgates'),
      Effect.timeout('10 seconds'),
      Effect.catchAll((error) =>
        Effect.gen(function* (_) {
          yield* _(Console.error('Timeout or error:', error));
          return null;
        })
      )
    );

    if (profile) {
      yield* _(Console.log('Profile retrieved:', profile));
    } else {
      yield* _(Console.log('Failed to retrieve profile within timeout'));
    }

    return profile;
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Example 8: Integration with Enrichment Pipeline ==========

export const exampleEnrichmentIntegration = () => {
  const program = Effect.gen(function* (_) {
    yield* _(Console.log('=== Enrichment Pipeline Integration ==='));

    // Simulate enrichment flow
    const companyUrl = 'https://www.linkedin.com/company/microsoft';

    // Step 1: Get company data
    const companyData = yield* _(getLinkedInCompany(companyUrl));

    yield* _(Console.log('Company data:', companyData));

    // Step 2: Search for employees (if needed)
    if (companyData.company_name) {
      const employees = yield* _(
        searchLinkedInPeople('Engineer', {
          company: companyData.company_name,
          limit: 5,
        }),
        Effect.catchAll(() => Effect.succeed([]))
      );

      yield* _(Console.log(`Found ${employees.length} employees`));
    }

    return {
      company: companyData,
      enrichedAt: new Date().toISOString(),
    };
  });

  return Effect.provide(program, LinkedInAPIServiceLive);
};

// ========== Main Test Runner ==========

export const runExamples = async () => {
  console.log('🚀 LinkedIn API Examples\n');

  // Run examples one by one
  const examples = [
    { name: 'Get Profile', fn: exampleGetProfile },
    { name: 'Get Company', fn: exampleGetCompany },
    { name: 'Search People', fn: exampleSearchPeople },
    { name: 'Search Jobs', fn: exampleSearchJobs },
    { name: 'Error Handling', fn: exampleErrorHandling },
    { name: 'Batch Processing', fn: exampleBatchProcessing },
    { name: 'With Timeout', fn: exampleWithTimeout },
    { name: 'Enrichment Integration', fn: exampleEnrichmentIntegration },
  ];

  for (const example of examples) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Running: ${example.name}`);
    console.log('='.repeat(50));

    try {
      await Effect.runPromise(example.fn());
    } catch (error) {
      console.error(`❌ ${example.name} failed:`, error);
    }

    // Wait between examples to respect rate limits
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log('\n✅ All examples completed');
};

// Run if executed directly
if (import.meta.main) {
  runExamples().catch(console.error);
}
