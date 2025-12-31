import { Elysia, t } from 'elysia';

/**
 * Milestone 0: Simple enrichment endpoint with SSE
 * Hardcoded fake enrichment with real-time updates
 */
export const simpleEnrichmentRoutes = new Elysia({ prefix: '/api/enrich-simple' })
  /**
   * GET /api/enrich-simple/row/:tableId/:rowId/:field - Enrich a single row with SSE updates
   * Returns: SSE stream with updates
   */
  .get('/row/:tableId/:rowId/:field', async ({ params, set }) => {
    const { rowId, tableId, field } = params;

      // Set headers for SSE
      set.headers = {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      };

      // Create a readable stream for SSE
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();

          // Helper to send SSE message
          const sendEvent = (event: string, data: any) => {
            const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(message));
          };

          try {
            // Step 1: Processing status
            sendEvent('status', {
              rowId,
              tableId,
              field,
              status: 'processing',
              value: 'processing...',
              timestamp: new Date().toISOString(),
            });

            // Simulate processing delay
            await new Promise((resolve) => setTimeout(resolve, 1500));

            // Step 2: Complete with fake data
            const fakeEnrichedData = {
              company_name: 'Example Corp',
              company_website: 'example.com',
              company_domain: 'example.com',
              company_description: 'A leading example company in the tech industry',
              company_industry: 'Technology',
              company_employee_count: '100-500',
            };

            const enrichedValue = fakeEnrichedData[field as keyof typeof fakeEnrichedData] || 'example.com';

            sendEvent('complete', {
              rowId,
              tableId,
              field,
              status: 'complete',
              value: enrichedValue,
              timestamp: new Date().toISOString(),
            });

            // Close the stream
            controller.close();
          } catch (error) {
            // Send error event
            sendEvent('error', {
              rowId,
              tableId,
              field,
              status: 'error',
              error: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString(),
            });
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }
  );

export const registerSimpleEnrichmentRoutes = (app: Elysia) =>
  app.use(simpleEnrichmentRoutes);
