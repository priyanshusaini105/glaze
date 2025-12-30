/**
 * Effect TS Usage Examples
 * 
 * Copy-paste examples for common enrichment patterns
 */

import { Effect, pipe } from 'effect';
import {
  runEnrichment,
  waterfallEnrichment,
  EnrichmentInput,
  ProviderError,
} from './services/effect-enrichment';
import { extractCompanyDataWithAI } from './services/effect-ai';

// ============================================
// Example 1: Basic Enrichment
// ============================================

export async function basicEnrichment() {
  const result = await runEnrichment({
    url: 'https://example.com',
    userId: 'user-123',
    budgetCents: 100,
  });

  console.log('Provider:', result.provider);
  console.log('Cost:', result.costCents);
  console.log('Data:', result.data);
}

// ============================================
// Example 2: Composing Effects
// ============================================

export const enrichWithLogging = (input: EnrichmentInput) =>
  pipe(
    waterfallEnrichment(input),
    Effect.tap((result) =>
      Effect.sync(() => {
        console.log(`✓ Success with ${result.provider}`);
        console.log(`  Cost: ${result.costCents}¢`);
        console.log(`  Attempts: ${result.attempts}`);
      })
    ),
    Effect.tapError((error) =>
      Effect.sync(() => {
        console.error(`✗ Failed: ${error.message}`);
      })
    )
  );

// Usage:
// await Effect.runPromise(enrichWithLogging({ ... }));

// ============================================
// Example 3: Batch Processing
// ============================================

export const batchEnrich = (urls: string[], budgetPerUrl: number) =>
  Effect.gen(function* (_) {
    const results = [];

    for (const url of urls) {
      const result = yield* _(
        waterfallEnrichment({
          url,
          userId: 'batch-user',
          budgetCents: budgetPerUrl,
        }),
        Effect.either // Don't fail on individual errors
      );

      results.push({
        url,
        success: result._tag === 'Right',
        data: result._tag === 'Right' ? result.right : null,
        error: result._tag === 'Left' ? result.left.message : null,
      });
    }

    return results;
  });

// Usage:
// const results = await Effect.runPromise(
//   batchEnrich(['https://a.com', 'https://b.com'], 50)
// );

// ============================================
// Example 4: With Timeout
// ============================================

export const enrichWithTimeout = (input: EnrichmentInput, timeoutMs: number) =>
  pipe(
    waterfallEnrichment(input),
    Effect.timeout(`${timeoutMs} millis`),
    Effect.catchTag('TimeoutException', () =>
      Effect.fail(
        new ProviderError('Timeout', `Enrichment took longer than ${timeoutMs}ms`)
      )
    )
  );

// Usage:
// await Effect.runPromise(enrichWithTimeout(input, 5000));

// ============================================
// Example 5: Retry with Custom Policy
// ============================================

import { Schedule } from 'effect';

const customRetryPolicy = pipe(
  Schedule.exponential('500 millis'), // Start with 500ms
  Schedule.compose(Schedule.recurs(4)), // 5 total attempts
  Schedule.jittered // Add randomness to prevent thundering herd
);

export const enrichWithCustomRetries = (input: EnrichmentInput) =>
  pipe(
    waterfallEnrichment(input),
    Effect.retry(customRetryPolicy),
    Effect.tapError((error) =>
      Effect.log(`All retries exhausted: ${error.message}`)
    )
  );

// ============================================
// Example 6: Parallel Enrichments
// ============================================

export const parallelEnrich = (urls: string[], budgetPerUrl: number) =>
  Effect.all(
    urls.map((url) =>
      waterfallEnrichment({
        url,
        userId: 'parallel-user',
        budgetCents: budgetPerUrl,
      })
    ),
    { concurrency: 3 } // Max 3 concurrent enrichments
  );

// Usage:
// const results = await Effect.runPromise(
//   parallelEnrich(['https://a.com', 'https://b.com'], 100)
// );

// ============================================
// Example 7: Enrichment + AI Analysis Pipeline
// ============================================

export const fullEnrichmentPipeline = (url: string, model: any) =>
  Effect.gen(function* (_) {
    // Step 1: Enrich data
    yield* _(Effect.log('Starting enrichment...'));
    const enrichment = yield* _(
      waterfallEnrichment({
        url,
        userId: 'pipeline-user',
        budgetCents: 100,
      })
    );

    // Step 2: Analyze with AI
    if (!enrichment.data) {
      return yield* _(
        Effect.fail(new ProviderError('Pipeline', 'No data to analyze'))
      );
    }

    yield* _(Effect.log('Analyzing with AI...'));
    const analysis = yield* _(
      extractCompanyDataWithAI(model, enrichment.data as Record<string, unknown>)
    );

    // Step 3: Return combined result
    return {
      enrichment,
      analysis,
      totalCost: enrichment.costCents,
      timestamp: new Date().toISOString(),
    };
  });

// ============================================
// Example 8: Error Recovery
// ============================================

export const enrichWithFallback = (input: EnrichmentInput) =>
  pipe(
    waterfallEnrichment(input),
    Effect.catchAll((error) => {
      // Log error and return fallback data
      console.error('Enrichment failed, using fallback:', error.message);

      return Effect.succeed({
        success: false,
        data: { fallback: true, url: input.url },
        provider: 'Fallback',
        costCents: 0,
        attempts: 0,
        timestamp: new Date().toISOString(),
      });
    })
  );

// ============================================
// Example 9: Conditional Enrichment
// ============================================

export const conditionalEnrich = (url: string, userTier: 'free' | 'pro') =>
  Effect.gen(function* (_) {
    const budget = userTier === 'pro' ? 100 : 25;

    yield* _(
      Effect.log(
        `Enriching with ${userTier} tier (budget: ${budget}¢)`
      )
    );

    return yield* _(
      waterfallEnrichment({
        url,
        userId: `${userTier}-user`,
        budgetCents: budget,
      })
    );
  });

// ============================================
// Example 10: Metrics Collection
// ============================================

export const enrichWithMetrics = (input: EnrichmentInput) =>
  Effect.gen(function* (_) {
    const startTime = Date.now();

    const result = yield* _(
      waterfallEnrichment(input),
      Effect.either
    );

    const duration = Date.now() - startTime;

    // Log metrics
    yield* _(
      Effect.sync(() => {
        console.log('Metrics:', {
          success: result._tag === 'Right',
          duration,
          provider:
            result._tag === 'Right' ? result.right.provider : 'none',
          cost: result._tag === 'Right' ? result.right.costCents : 0,
        });
      })
    );

    // Return original result
    return result._tag === 'Right'
      ? result.right
      : yield* _(Effect.fail(result.left));
  });

// ============================================
// Export all examples
// ============================================

export const examples = {
  basicEnrichment,
  enrichWithLogging,
  batchEnrich,
  enrichWithTimeout,
  enrichWithCustomRetries,
  parallelEnrich,
  fullEnrichmentPipeline,
  enrichWithFallback,
  conditionalEnrich,
  enrichWithMetrics,
};
