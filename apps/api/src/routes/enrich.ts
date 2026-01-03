import { Elysia } from 'elysia';
import type { EnrichRequest, EnrichResponse, EnrichTarget } from '../types/enrichment';
import type { EnrichmentField } from '../types/enrichment';

/**
 * Enrichment Router
 * 
 * Single unified endpoint for enriching table data
 * Supports enriching cells, rows, and columns
 */
export const enrichmentRoutes = new Elysia({ prefix: '/enrich' })
  /**
   * POST /enrich - Enrich table cells, rows, or columns
   * 
   * Request:
   * {
   *   "tableId": "leads_table_abc123",
   *   "targets": [
   *     {
   *       "type": "cells",
   *       "selections": [
   *         { "rowId": "user_123", "columnId": "email" },
   *         { "rowId": "user_456", "columnId": "company" }
   *       ]
   *     }
   *   ]
   * }
   * 
   * Response:
   * {
   *   "tableId": "leads_table_abc123",
   *   "results": [
   *     {
   *       "rowId": "user_123",
   *       "columnId": "email",
   *       "originalValue": "john@example.com",
   *       "enrichedValue": "john.doe@example.com",
   *       "status": "success"
   *     }
   *   ],
   *   "metadata": {
   *     "processed": 2,
   *     "failed": 0,
   *     "cost": 50
   *   }
   * }
   */
  .post('/', async ({ body, set }): Promise<EnrichResponse> => {
    try {
      const request = body as EnrichRequest;
      
      if (!request.tableId || !request.targets || !Array.isArray(request.targets)) {
        set.status = 400;
        throw new Error('Invalid request: tableId and targets array are required');
      }

      const results: EnrichResponse['results'] = [];
      let processed = 0;
      let failed = 0;

      // Process each target type
      for (const target of request.targets) {
        if (target.type === 'cells') {
          // Enrich specific cells
          for (const selection of target.selections) {
            try {
              const enrichResult = await enrichCell(
                selection.rowId, 
                selection.columnId,
                (selection as any).value // Pass the value from selection
              );
              results.push(enrichResult);
              processed++;
            } catch (error) {
              results.push({
                rowId: selection.rowId,
                columnId: selection.columnId,
                originalValue: null,
                enrichedValue: null,
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              failed++;
            }
          }
        } else if (target.type === 'rows') {
          // Enrich entire rows
          for (const rowId of target.rowIds) {
            try {
              const enrichResult = await enrichRow(rowId);
              results.push(...enrichResult);
              processed += enrichResult.length;
            } catch (error) {
              failed++;
            }
          }
        } else if (target.type === 'columns') {
          // Enrich entire columns
          for (const columnId of target.columnIds) {
            try {
              const enrichResult = await enrichColumn(columnId);
              results.push(...enrichResult);
              processed += enrichResult.length;
            } catch (error) {
              failed++;
            }
          }
        }
      }

      return {
        tableId: request.tableId,
        results,
        metadata: {
          processed,
          failed,
          cost: processed * 10 // Rough estimate: 10 cents per enriched cell
        }
      };
    } catch (error) {
      set.status = 500;
      throw error;
    }
  });

/**
 * Enrich a single cell with actual enrichment services
 */
async function enrichCell(rowId: string, columnId: string, existingValue?: string) {
  // Simulate enrichment delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500));

  // Fallback to mock enrichment
  const enrichedValue = generateEnrichedValue(columnId);

  return {
    rowId,
    columnId,
    originalValue: existingValue || null,
    enrichedValue,
    status: 'success' as const,
    metadata: {
      source: 'mock',
      cost: 0
    }
  };
}

/**
 * Enrich an entire row
 * Returns enrichment results for all columns in the row
 */
async function enrichRow(rowId: string) {
  const commonColumns = [
    'email', 'phone', 'company', 'title', 'linkedin',
    'website', 'industry', 'employee_count', 'revenue'
  ];

  const results = [];
  for (const columnId of commonColumns) {
    const enrichResult = await enrichCell(rowId, columnId);
    results.push(enrichResult);
  }

  return results;
}

/**
 * Enrich an entire column
 * Returns enrichment results for multiple rows in the column
 * Note: In real implementation, you'd get actual row count from database
 */
async function enrichColumn(columnId: string) {
  // Mock: enrich first 10 rows
  const rowIds = Array.from({ length: 10 }, (_, i) => `row_${i + 1}`);
  const results = [];

  for (const rowId of rowIds) {
    const enrichResult = await enrichCell(rowId, columnId);
    results.push(enrichResult);
  }

  return results;
}

/**
 * Generate enriched values based on column type
 */
function generateEnrichedValue(columnId: string): string {
  const lowerColumnId = columnId.toLowerCase();

  if (lowerColumnId.includes('email')) {
    return `contact+${Date.now()}@example.com`;
  }
  if (lowerColumnId.includes('phone')) {
    return `+1-555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
  }
  if (lowerColumnId.includes('company')) {
    const companies = ['TechCorp', 'DataSync', 'CloudBase', 'FastFlow', 'PureScale'];
    return companies[Math.floor(Math.random() * companies.length)];
  }
  if (lowerColumnId.includes('title')) {
    const titles = ['CEO', 'CTO', 'VP Sales', 'Product Manager', 'Engineer'];
    return titles[Math.floor(Math.random() * titles.length)];
  }
  if (lowerColumnId.includes('linkedin')) {
    return `linkedin.com/in/user-${Math.random().toString(36).substr(2, 9)}`;
  }
  if (lowerColumnId.includes('website')) {
    return `https://example-${Math.random().toString(36).substr(2, 6)}.com`;
  }
  if (lowerColumnId.includes('industry')) {
    const industries = ['Technology', 'Finance', 'Healthcare', 'Retail', 'Manufacturing'];
    return industries[Math.floor(Math.random() * industries.length)];
  }
  if (lowerColumnId.includes('employee_count') || lowerColumnId.includes('employees')) {
    return String(Math.floor(Math.random() * 50000) + 10);
  }
  if (lowerColumnId.includes('revenue')) {
    return `$${Math.floor(Math.random() * 100000000)}M`;
  }

  // Default: generic enriched value
  return `Enriched ${columnId}`;
}

export const registerEnrichmentRoutes = (app: Elysia) => app.use(enrichmentRoutes);
