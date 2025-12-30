/**
 * Vercel AI SDK integration with Effect TS
 * 
 * Wraps AI calls inside Effect for proper error handling and composition
 */

import { Effect, Schedule, pipe } from 'effect';
import { generateText, generateObject } from 'ai';
import * as Schema from '@effect/schema/Schema';

// ========== Error Types ==========

export class AIProviderError {
  readonly _tag = 'AIProviderError';
  constructor(
    readonly provider: string,
    readonly message: string,
    readonly cause?: unknown
  ) {}
}

export class AIValidationError {
  readonly _tag = 'AIValidationError';
  constructor(
    readonly message: string,
    readonly errors: unknown
  ) {}
}

// ========== Schemas ==========

export const CompanyDataSchema = Schema.Struct({
  name: Schema.String,
  industry: Schema.String,
  description: Schema.String,
  estimatedEmployees: Schema.optional(Schema.String),
  estimatedRevenue: Schema.optional(Schema.String),
  keywords: Schema.Array(Schema.String),
});

export type CompanyData = Schema.Schema.Type<typeof CompanyDataSchema>;

// ========== AI Service with Effect ==========

/**
 * Generate text using AI with Effect wrapper
 */
export const generateTextEffect = (
  model: any,
  prompt: string
): Effect.Effect<string, AIProviderError> =>
  Effect.gen(function* (_) {
    yield* _(Effect.log(`[AI] Generating text...`));
    
    try {
      const result = yield* _(
        Effect.tryPromise({
          try: () =>
            generateText({
              model,
              prompt,
            }),
          catch: (error) =>
            new AIProviderError(
              'OpenAI',
              'Text generation failed',
              error
            ),
        })
      );
      
      yield* _(Effect.log(`[AI] Generated ${result.text.length} characters`));
      return result.text;
    } catch (error) {
      return yield* _(
        Effect.fail(
          new AIProviderError(
            'OpenAI',
            'Unexpected error during text generation',
            error
          )
        )
      );
    }
  });

/**
 * Generate structured object using AI with Effect wrapper
 */
export const generateObjectEffect = <T>(
  model: any,
  prompt: string,
  schema: any
): Effect.Effect<T, AIProviderError> =>
  Effect.gen(function* (_) {
    yield* _(Effect.log(`[AI] Generating structured object...`));
    
    try {
      const result = yield* _(
        Effect.tryPromise({
          try: () =>
            generateObject({
              model,
              prompt,
              schema,
            }),
          catch: (error) =>
            new AIProviderError(
              'OpenAI',
              'Object generation failed',
              error
            ),
        })
      );
      
      yield* _(Effect.log(`[AI] Successfully generated structured object`));
      return result.object as T;
    } catch (error) {
      return yield* _(
        Effect.fail(
          new AIProviderError(
            'OpenAI',
            'Unexpected error during object generation',
            error
          )
        )
      );
    }
  });

/**
 * Retry policy for AI calls - more conservative than enrichment
 */
export const aiRetryPolicy = pipe(
  Schedule.exponential('2 seconds'),
  Schedule.compose(Schedule.recurs(1)), // 2 total attempts
);

/**
 * Extract company data from enrichment result using AI
 */
export const extractCompanyDataWithAI = (
  model: any,
  enrichmentData: Record<string, unknown>
): Effect.Effect<CompanyData, AIProviderError | AIValidationError> =>
  Effect.gen(function* (_) {
    yield* _(Effect.log('[AI Service] Extracting company data...'));
    
    const prompt = `
Based on the following enrichment data, extract company information:

${JSON.stringify(enrichmentData, null, 2)}

Provide:
- Company name
- Industry
- Brief description
- Estimated employee count (range)
- Estimated revenue (range if available)
- Relevant keywords (max 5)
`;
    
    // Generate structured output with retry
    const result = yield* _(
      pipe(
        generateTextEffect(model, prompt),
        Effect.retry(aiRetryPolicy),
        Effect.tapError((error) =>
          Effect.log(`[AI Service] Failed: ${error.message}`)
        )
      )
    );
    
    // For demo purposes, parse the result manually
    // In production, use generateObject with Zod schema
    const companyData: CompanyData = {
      name: enrichmentData.title as string || 'Unknown Company',
      industry: enrichmentData.industry as string || 'Unknown',
      description: result.substring(0, 200),
      estimatedEmployees: enrichmentData.employees as string,
      estimatedRevenue: enrichmentData.revenue as string,
      keywords: ['saas', 'technology', 'b2b'],
    };
    
    // Validate using Effect Schema
    const validated = yield* _(
      Schema.decodeUnknown(CompanyDataSchema)(companyData),
      Effect.mapError(
        (error) => new AIValidationError('Invalid company data', error)
      )
    );
    
    yield* _(Effect.log('[AI Service] Successfully extracted company data'));
    return validated;
  });

/**
 * Enrich and analyze with AI - combines enrichment + AI extraction
 */
export const enrichAndAnalyze = (
  model: any,
  enrichmentData: Record<string, unknown>
): Effect.Effect<
  {
    enrichment: Record<string, unknown>;
    aiAnalysis: CompanyData;
  },
  AIProviderError | AIValidationError
> =>
  Effect.gen(function* (_) {
    yield* _(Effect.log('Starting enrichment analysis...'));
    
    const aiAnalysis = yield* _(
      extractCompanyDataWithAI(model, enrichmentData)
    );
    
    return {
      enrichment: enrichmentData,
      aiAnalysis,
    };
  });

// ========== Example Usage ==========

/**
 * Run AI enrichment analysis
 */
export const runAIAnalysis = async (
  model: any,
  data: Record<string, unknown>
): Promise<CompanyData> => {
  const program = extractCompanyDataWithAI(model, data);
  return Effect.runPromise(program);
};
