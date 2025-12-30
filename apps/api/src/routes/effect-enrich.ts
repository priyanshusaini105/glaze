/**
 * Effect-based Enrichment Routes for ElysiaJS
 * 
 * Type-safe routes using Elysia Eden
 */

import { Elysia, t } from 'elysia';
import { Effect } from 'effect';
import {
  runEnrichment,
  EnrichmentInput,
  EnrichmentResult,
  ProviderError,
  BudgetExceededError,
  ValidationError,
} from '../services/effect-enrichment';
import {
  runAIAnalysis,
  CompanyData,
  AIProviderError,
  AIValidationError,
} from '../services/effect-ai';

// ========== Route Handlers ==========

/**
 * Effect Enrichment Routes
 */
export const effectEnrichmentRoutes = new Elysia({ prefix: '/effect' })
  // Basic waterfall enrichment
  .post(
    '/enrich',
    async ({ body, set }) => {
      try {
        const result = await runEnrichment(body);
        
        return {
          success: true,
          result,
        };
      } catch (error) {
        // Handle Effect errors
        if (error instanceof ValidationError) {
          set.status = 400;
          return {
            success: false,
            error: 'ValidationError',
            message: error.message,
            details: error.errors,
          };
        }
        
        if (error instanceof BudgetExceededError) {
          set.status = 402;
          return {
            success: false,
            error: 'BudgetExceededError',
            message: `Insufficient budget: ${error.available}¢ available, ${error.requested}¢ required`,
            requested: error.requested,
            available: error.available,
          };
        }
        
        if (error instanceof ProviderError) {
          set.status = 503;
          return {
            success: false,
            error: 'ProviderError',
            provider: error.provider,
            message: error.message,
          };
        }
        
        // Unknown error
        set.status = 500;
        return {
          success: false,
          error: 'UnknownError',
          message: error instanceof Error ? error.message : 'An unknown error occurred',
        };
      }
    },
    {
      body: t.Object({
        url: t.String({ minLength: 1 }),
        userId: t.String(),
        budgetCents: t.Number({ minimum: 0 }),
      }),
      detail: {
        summary: 'Enrich URL using waterfall provider strategy',
        description:
          'Attempts to enrich a URL by trying multiple providers in sequence (A -> B -> C) until one succeeds. Uses Effect TS for error handling and retries.',
        tags: ['Effect', 'Enrichment'],
      },
    }
  )

  // Enrich with AI analysis (mock - requires API key setup)
  .post(
    '/enrich-with-ai',
    async ({ body, set }) => {
      try {
        // First, run enrichment
        const enrichmentResult = await runEnrichment(body);
        
        if (!enrichmentResult.success || !enrichmentResult.data) {
          set.status = 503;
          return {
            success: false,
            error: 'EnrichmentFailed',
            message: 'Failed to enrich data',
          };
        }
        
        // For demo purposes, skip actual AI call
        // In production, you would:
        // const aiAnalysis = await runAIAnalysis(model, enrichmentResult.data);
        
        return {
          success: true,
          enrichment: enrichmentResult,
          aiAnalysis: {
            note: 'AI analysis requires API key setup. This is a demo response.',
            data: enrichmentResult.data,
          },
        };
      } catch (error) {
        set.status = 500;
        return {
          success: false,
          error: 'ProcessingError',
          message: error instanceof Error ? error.message : 'Failed to process request',
        };
      }
    },
    {
      body: t.Object({
        url: t.String({ minLength: 1 }),
        userId: t.String(),
        budgetCents: t.Number({ minimum: 0 }),
      }),
      detail: {
        summary: 'Enrich URL and analyze with AI',
        description:
          'Enriches a URL using the waterfall strategy, then uses AI to extract and structure company data.',
        tags: ['Effect', 'AI', 'Enrichment'],
      },
    }
  )

  // Health check for Effect service
  .get(
    '/health',
    () => ({
      status: 'healthy',
      service: 'effect-enrichment',
      timestamp: new Date().toISOString(),
      providers: ['ProviderA', 'ProviderB', 'ProviderC'],
    }),
    {
      detail: {
        summary: 'Effect enrichment service health check',
        tags: ['Effect'],
      },
    }
  )

  // Demo endpoint - simulate multiple enrichments
  .post(
    '/demo/batch',
    async ({ body }) => {
      const { urls, budgetPerUrl } = body;
      
      const results = await Promise.allSettled(
        urls.map((url) =>
          runEnrichment({
            url,
            userId: 'demo-user',
            budgetCents: budgetPerUrl,
          })
        )
      );
      
      return {
        success: true,
        total: urls.length,
        succeeded: results.filter((r) => r.status === 'fulfilled').length,
        failed: results.filter((r) => r.status === 'rejected').length,
        results: results.map((result, index) => ({
          url: urls[index],
          status: result.status,
          data: result.status === 'fulfilled' ? result.value : undefined,
          error:
            result.status === 'rejected'
              ? result.reason instanceof Error
                ? result.reason.message
                : 'Unknown error'
              : undefined,
        })),
      };
    },
    {
      body: t.Object({
        urls: t.Array(t.String(), { minItems: 1, maxItems: 10 }),
        budgetPerUrl: t.Number({ minimum: 10, maximum: 1000 }),
      }),
      detail: {
        summary: 'Demo batch enrichment',
        description: 'Enrich multiple URLs in parallel for demonstration purposes',
        tags: ['Effect', 'Demo'],
      },
    }
  );
