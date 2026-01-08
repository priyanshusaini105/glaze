import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { tablesRoutes } from './routes/tables';
import { registerEnrichmentRoutes } from './routes/enrich';
import { registerLinkedInRoutes } from './routes/linkedin';
import { registerCellEnrichmentRoutes } from './routes/cell-enrich';
import { optimizedEnrichmentRoutes } from './routes/enrich-optimized';
import { columnsAIRoutes } from './routes/columns-ai';
import { seatsRoutes } from './routes/seats';

export const buildApp = () => {
  const app = new Elysia()
    .use(cors())
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Glaze API',
            version: '0.5.0',
            description: 'High-performance data enrichment platform with entity-based enrichment'
          },
          servers: [
            {
              url: process.env.API_URL || `http://localhost:${process.env.PORT ?? 3001}`
            }
          ]
        },
        provider: 'swagger-ui',
        path: '/docs',
        specPath: '/docs/json'
      })
    )
    .get('/health', () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'glaze-api',
      uptime: process.uptime()
    }))
    .get('/', () => ({
      message: 'Welcome to Glaze API',
      version: '0.5.0',
      endpoints: {
        health: '/health',
        tables: '/tables',
        enrich: '/enrich',
        enrichOptimized: '/v2/tables/:tableId/enrich',
        cellEnrich: '/tables/:tableId/enrich',
        linkedin: '/linkedin',
        seats: '/me/seat',
        credits: '/me/credits',
        docs: '/docs'
      }
    }))
    .use(tablesRoutes)
    .use(registerEnrichmentRoutes)
    .use(registerLinkedInRoutes)
    .use(registerCellEnrichmentRoutes)
    .use(optimizedEnrichmentRoutes)
    .use(columnsAIRoutes)
    .use(seatsRoutes);

  return app;
};

// Export type for Elysia Eden (type-safe client)
export type App = ReturnType<typeof buildApp>;

export const startServer = (port = Number(process.env.PORT) || 3001) => {
  const app = buildApp();

  // Note: BullMQ worker removed - all enrichment now handled by Trigger.dev
  // See apps/workflows/src/cell-enrichment.ts for the Trigger.dev workflow

  // Use Bun's native server with Elysia
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(
    `🦊 Elysia is running at http://${server.hostname}:${server.port}`
  );

  // Log connection pool stats on startup
  console.log('🔌 Database connection pool initialized');

  // Optional: Enable periodic connection pool monitoring
  // Uncomment to see pool stats every minute:
  /*
  import { pool } from './db';
  
  setInterval(() => {
    console.log('📊 Connection Pool Stats:', {
      total: pool.totalCount,      // Total connections
      idle: pool.idleCount,        // Available for reuse
      waiting: pool.waitingCount,  // Waiting for connection
    });
  }, 60000); // Every 60 seconds
  */

  return server;
};
