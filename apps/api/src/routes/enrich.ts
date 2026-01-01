import { Elysia } from 'elysia';
import { enqueueEnrichment, getJobStatus, enrichmentQueue } from '../services/enrichment-queue';
import { enrichmentRequestSchema, ENRICHMENT_FIELDS } from '../types/enrichment';
import { normalizeInput } from '../services/enrichment-pipeline';
import { getCacheStats } from '../services/enrichment-cache';
import { isSearchServiceConfigured } from '../services/search-service';
import { isContactOutConfigured, getContactOutCost } from '../services/contactout-client';
import { 
  simulateEnrichCell, 
  simulateEnrichArray, 
  simulateEnrichColumn, 
  simulateEnrichRow,
  calculateSimulatedCost 
} from '../services/enrichment-simulator';

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
   * POST /enrich - Enqueue a new enrichment job or enrich table cells
   */
  .post('/', async ({ body, set }) => {
    // Check if this is a table cell enrichment request
    if (body && typeof body === 'object' && 'cells' in body && Array.isArray(body.cells)) {
      try {
        const { tableId, cells } = body as { tableId: string; cells: Array<{
          rowId: string;
          columnKey: string;
          cellValue: string;
          rowData: Record<string, unknown>;
        }> };

        const enrichedCells = [];
        
        for (const cell of cells) {
          // Skip if row has no meaningful data
          if (!cell.rowData || Object.keys(cell.rowData).length === 0) {
            continue;
          }

          // For now, simulate enrichment
          // In production, use row context to enrich the specific cell
          const startTime = Date.now();
          
          // Simulate delay
          await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
          
          // Mock enriched value based on column
          let enrichedValue = cell.cellValue;
          if (!enrichedValue || enrichedValue.trim() === '') {
            // Use row context to generate enriched value
            if (cell.columnKey.includes('email')) {
              enrichedValue = `contact@example.com`;
            } else if (cell.columnKey.includes('phone')) {
              enrichedValue = `+1-555-${Math.floor(1000 + Math.random() * 9000)}`;
            } else if (cell.columnKey.includes('linkedin')) {
              enrichedValue = `linkedin.com/in/example`;
            } else {
              enrichedValue = `Enriched ${cell.columnKey}`;
            }
          }
          
          enrichedCells.push({
            rowId: cell.rowId,
            columnKey: cell.columnKey,
            enrichedValue,
            confidence: Math.floor(70 + Math.random() * 30),
            source: 'simulation',
            durationMs: Date.now() - startTime,
          });
        }

        return {
          success: true,
          tableId,
          enrichedCells,
          totalCells: enrichedCells.length,
          skippedCells: cells.length - enrichedCells.length,
        };
      } catch (err) {
        set.status = 500;
        return {
          error: 'Cell enrichment failed',
          details: err instanceof Error ? err.message : 'unknown error'
        };
      }
    }

    // Original enrichment request
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

      const { normalizedUrl, inputType } = normalizeInput(parsed.data.url || '');

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
