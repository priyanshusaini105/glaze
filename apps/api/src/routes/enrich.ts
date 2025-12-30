import { Elysia } from 'elysia';
import { enqueueEnrichment, getJobStatus, enrichmentQueue } from '../services/enrichment-queue';
import { enrichmentRequestSchema, ENRICHMENT_FIELDS } from '../types/enrichment';
import { normalizeInput } from '../services/enrichment-pipeline';
import { getCacheStats } from '../services/enrichment-cache';
import { isSearchServiceConfigured } from '../services/search-service';
import { isContactOutConfigured, getContactOutCost } from '../services/contactout-client';

export const enrichmentRoutes = new Elysia({ prefix: '/enrich' })
  /**
   * GET /enrich/fields - List all available enrichment fields
   */
  .get('/fields', () => {
    const companyFields = ENRICHMENT_FIELDS.filter((f) => f.startsWith('company_'));
    const personFields = ENRICHMENT_FIELDS.filter((f) => f.startsWith('person_'));

    return {
      all: ENRICHMENT_FIELDS,
      company: companyFields,
      person: personFields
    };
  })
  /**
   * GET /enrich/services - Check what services are configured
   */
  .get('/services', () => {
    return {
      search: {
        configured: isSearchServiceConfigured(),
        provider: 'Serper',
        costPerQuery: 1
      },
      contactOut: {
        configured: isContactOutConfigured(),
        costPerLookup: getContactOutCost()
      },
      cache: {
        available: true,
        ttlDays: 7
      }
    };
  })
  /**
   * GET /enrich/queue - Get queue statistics
   */
  .get('/queue', async () => {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      enrichmentQueue.getWaitingCount(),
      enrichmentQueue.getActiveCount(),
      enrichmentQueue.getCompletedCount(),
      enrichmentQueue.getFailedCount(),
      enrichmentQueue.getDelayedCount()
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed
    };
  })
  /**
   * GET /enrich/cache - Get cache statistics
   */
  .get('/cache', async () => {
    return await getCacheStats();
  })
  /**
   * POST /enrich - Enqueue a new enrichment job
   */
  .post('/', async ({ body, set }) => {
    const parsed = enrichmentRequestSchema.safeParse(body);

    if (!parsed.success) {
      set.status = 400;
      return {
        error: 'Invalid request',
        issues: parsed.error.issues
      };
    }

    try {
      const jobId = await enqueueEnrichment({
        ...parsed.data,
        requestedAt: new Date().toISOString()
      });

      const { normalizedUrl, inputType } = normalizeInput(parsed.data.url);

      return { 
        jobId,
        normalizedUrl,
        detectedInputType: parsed.data.inputType || inputType,
        requiredFields: parsed.data.requiredFields,
        budgetCents: parsed.data.budgetCents || 0
      };
    } catch (err) {
      set.status = 500;
      return {
        error: 'Failed to enqueue enrichment job',
        details: err instanceof Error ? err.message : 'unknown error'
      };
    }
  })
  /**
   * GET /enrich/:jobId - Get job status (must be last due to param matching)
   */
  .get('/:jobId', async ({ params, set }) => {
    const status = await getJobStatus(params.jobId);

    if (!status) {
      set.status = 404;
      return { error: 'Job not found' };
    }

    return status;
  });

export const registerEnrichmentRoutes = (app: Elysia) => app.use(enrichmentRoutes);
