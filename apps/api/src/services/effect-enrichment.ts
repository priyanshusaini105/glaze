/**
 * Effect TS-based Enrichment Service
 * 
 * Implements waterfall pattern with automatic retries and error handling
 * Provider A -> Provider B -> Provider C pattern
 */

import { Effect, Schedule, pipe } from 'effect';
import * as Schema from '@effect/schema/Schema';

// ========== Schema Definitions ==========

export const EnrichmentInput = Schema.Struct({
  url: Schema.String,
  userId: Schema.String,
  budgetCents: Schema.Number,
});

export const EnrichmentResult = Schema.Struct({
  success: Schema.Boolean,
  data: Schema.optional(Schema.Unknown),
  provider: Schema.String,
  costCents: Schema.Number,
  attempts: Schema.Number,
  timestamp: Schema.String,
});

export type EnrichmentInput = Schema.Schema.Type<typeof EnrichmentInput>;
export type EnrichmentResult = Schema.Schema.Type<typeof EnrichmentResult>;

// ========== Error Types ==========

export class ProviderError {
  readonly _tag = 'ProviderError';
  constructor(
    readonly provider: string,
    readonly message: string,
    readonly cause?: unknown
  ) {}
}

export class BudgetExceededError {
  readonly _tag = 'BudgetExceededError';
  constructor(
    readonly requested: number,
    readonly available: number
  ) {}
}

export class ValidationError {
  readonly _tag = 'ValidationError';
  constructor(readonly message: string, readonly errors: unknown) {}
}

// ========== Provider Interface ==========

export interface EnrichmentProvider {
  name: string;
  costCents: number;
  lookup: (url: string) => Effect.Effect<Record<string, unknown>, ProviderError>;
}

// ========== Mock Providers ==========

/**
 * Provider A - Fast but unreliable (70% failure rate for demo)
 */
export const ProviderA: EnrichmentProvider = {
  name: 'ProviderA',
  costCents: 10,
  lookup: (url: string) =>
    Effect.gen(function* (_) {
      yield* _(Effect.log(`[ProviderA] Attempting lookup for ${url}`));
      
      // Simulate network delay
      yield* _(Effect.sleep('200 millis'));
      
      // 70% failure rate for demonstration
      const shouldFail = Math.random() < 0.7;
      
      if (shouldFail) {
        yield* _(Effect.log(`[ProviderA] Failed lookup for ${url}`));
        return yield* _(
          Effect.fail(
            new ProviderError('ProviderA', 'Service temporarily unavailable')
          )
        );
      }
      
      yield* _(Effect.log(`[ProviderA] Successfully found data for ${url}`));
      return {
        source: 'ProviderA',
        url,
        title: 'Sample Company A',
        industry: 'Technology',
        employees: '50-200',
        confidence: 0.7,
      };
    }),
};

/**
 * Provider B - Moderate reliability (40% failure rate)
 */
export const ProviderB: EnrichmentProvider = {
  name: 'ProviderB',
  costCents: 25,
  lookup: (url: string) =>
    Effect.gen(function* (_) {
      yield* _(Effect.log(`[ProviderB] Attempting lookup for ${url}`));
      
      yield* _(Effect.sleep('400 millis'));
      
      const shouldFail = Math.random() < 0.4;
      
      if (shouldFail) {
        yield* _(Effect.log(`[ProviderB] Failed lookup for ${url}`));
        return yield* _(
          Effect.fail(
            new ProviderError('ProviderB', 'Rate limit exceeded')
          )
        );
      }
      
      yield* _(Effect.log(`[ProviderB] Successfully found data for ${url}`));
      return {
        source: 'ProviderB',
        url,
        title: 'Sample Company B',
        industry: 'SaaS',
        employees: '200-500',
        revenue: '$10M-$50M',
        confidence: 0.85,
      };
    }),
};

/**
 * Provider C - Most reliable (10% failure rate) but expensive
 */
export const ProviderC: EnrichmentProvider = {
  name: 'ProviderC',
  costCents: 50,
  lookup: (url: string) =>
    Effect.gen(function* (_) {
      yield* _(Effect.log(`[ProviderC] Attempting lookup for ${url}`));
      
      yield* _(Effect.sleep('600 millis'));
      
      const shouldFail = Math.random() < 0.1;
      
      if (shouldFail) {
        yield* _(Effect.log(`[ProviderC] Failed lookup for ${url}`));
        return yield* _(
          Effect.fail(
            new ProviderError('ProviderC', 'Database connection timeout')
          )
        );
      }
      
      yield* _(Effect.log(`[ProviderC] Successfully found data for ${url}`));
      return {
        source: 'ProviderC',
        url,
        title: 'Sample Company C',
        industry: 'Enterprise Software',
        employees: '500-1000',
        revenue: '$50M-$100M',
        founded: '2015',
        location: 'San Francisco, CA',
        confidence: 0.95,
      };
    }),
};

// ========== Retry Policy ==========

/**
 * Exponential backoff: 1s, 2s, 4s (max 3 retries)
 */
export const retryPolicy = pipe(
  Schedule.exponential('1 second'),
  Schedule.compose(Schedule.recurs(2)), // 3 total attempts
  Schedule.either(Schedule.spaced('2 seconds'))
);

// ========== Core Enrichment Service ==========

/**
 * Try a single provider with retry logic
 */
const tryProvider = (
  provider: EnrichmentProvider,
  url: string,
  budget: number
): Effect.Effect<
  EnrichmentResult,
  ProviderError | BudgetExceededError
> =>
  Effect.gen(function* (_) {
    // Check budget
    if (budget < provider.costCents) {
      yield* _(Effect.log(
        `[${provider.name}] Insufficient budget: ${budget}¢ < ${provider.costCents}¢`
      ));
      return yield* _(
        Effect.fail(
          new BudgetExceededError(provider.costCents, budget)
        )
      );
    }
    
    // Track attempts
    let attempts = 0;
    
    // Lookup with retry policy
    const data = yield* _(
      pipe(
        provider.lookup(url),
        Effect.tap(() => Effect.sync(() => { attempts++; })),
        Effect.retry(retryPolicy),
        Effect.tapError((error) =>
          Effect.log(
            `[${provider.name}] All retry attempts exhausted: ${error.message}`
          )
        )
      )
    );
    
    yield* _(Effect.log(
      `[${provider.name}] Success after ${attempts} attempt(s)`
    ));
    
    return {
      success: true,
      data,
      provider: provider.name,
      costCents: provider.costCents,
      attempts: attempts,
      timestamp: new Date().toISOString(),
    };
  });

/**
 * Waterfall Enrichment: Try providers in sequence until one succeeds
 */
export const waterfallEnrichment = (
  input: EnrichmentInput
): Effect.Effect<
  EnrichmentResult,
  ValidationError | BudgetExceededError | ProviderError
> =>
  Effect.gen(function* (_) {
    yield* _(Effect.log('='.repeat(60)));
    yield* _(Effect.log(`Starting waterfall enrichment for ${input.url}`));
    yield* _(Effect.log(`Budget: ${input.budgetCents}¢`));
    yield* _(Effect.log('='.repeat(60)));
    
    const providers = [ProviderA, ProviderB, ProviderC];
    let remainingBudget = input.budgetCents;
    
    // Try each provider in sequence
    for (const provider of providers) {
      yield* _(Effect.log(`\nTrying ${provider.name}...`));
      
      const result = yield* _(
        tryProvider(provider, input.url, remainingBudget),
        Effect.either
      );
      
      if (result._tag === 'Right') {
        // Success!
        yield* _(Effect.log('\n' + '='.repeat(60)));
        yield* _(Effect.log(`✓ Enrichment completed successfully`));
        yield* _(Effect.log(`Provider: ${result.right.provider}`));
        yield* _(Effect.log(`Cost: ${result.right.costCents}¢`));
        yield* _(Effect.log(`Attempts: ${result.right.attempts}`));
        yield* _(Effect.log('='.repeat(60)));
        return result.right;
      }
      
      // Handle failure
      const error = result.left;
      
      if (error._tag === 'BudgetExceededError') {
        yield* _(Effect.log(
          `✗ ${provider.name} skipped: insufficient budget`
        ));
        continue; // Try next provider
      }
      
      if (error._tag === 'ProviderError') {
        yield* _(Effect.log(
          `✗ ${provider.name} failed: ${error.message}`
        ));
        // Deduct cost even on failure (optional, adjust as needed)
        remainingBudget -= provider.costCents;
        continue; // Try next provider
      }
    }
    
    // All providers failed
    yield* _(Effect.log('\n' + '='.repeat(60)));
    yield* _(Effect.log('✗ All providers failed'));
    yield* _(Effect.log('='.repeat(60)));
    
    return yield* _(
      Effect.fail(
        new ProviderError(
          'EnrichmentService',
          'All providers exhausted - no data found'
        )
      )
    );
  });

/**
 * Validate and enrich - Entry point with schema validation
 */
export const enrichWithValidation = (
  input: unknown
): Effect.Effect<
  EnrichmentResult,
  ValidationError | BudgetExceededError | ProviderError
> =>
  Effect.gen(function* (_) {
    // Validate input
    const validated = yield* _(
      Schema.decodeUnknown(EnrichmentInput)(input),
      Effect.mapError(
        (error) => new ValidationError('Invalid input', error)
      )
    );
    
    // Run enrichment
    return yield* _(waterfallEnrichment(validated));
  });

// ========== Run Helper ==========

/**
 * Helper to run an Effect with runtime
 */
export const runEnrichment = async (input: unknown): Promise<EnrichmentResult> => {
  const program = enrichWithValidation(input);
  
  return Effect.runPromise(program);
};
