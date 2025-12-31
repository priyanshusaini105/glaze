import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { registerIcpRoutes } from './routes/icps';
import { tablesRoutes } from './routes/tables';
import { registerEnrichmentRoutes } from './routes/enrich';
import { effectEnrichmentRoutes } from './routes/effect-enrich';
import { registerSimpleEnrichmentRoutes } from './routes/enrich-simple';
import { startEnrichmentWorker } from './services/enrichment-queue';

export const buildApp = () => {
  const app = new Elysia()
    .use(cors())
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Glaze API',
            version: '0.3.0',
            description: 'High-performance data enrichment platform with Effect TS'
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
      version: '0.3.0',
      endpoints: {
        health: '/health',
        icps: '/icps',
        resolveIcp: '/icps/resolve',
        tables: '/tables',
        effect: '/effect',
        docs: '/docs'
      }
    }))
    .use(tablesRoutes)
    .use(registerIcpRoutes)
    .use(registerEnrichmentRoutes)
    .use(effectEnrichmentRoutes)
    .use(registerSimpleEnrichmentRoutes);

  return app;
};

// Export type for Elysia Eden (type-safe client)
export type App = ReturnType<typeof buildApp>;

export const startServer = (port = Number(process.env.PORT) || 3001) => {
  const app = buildApp();

  if (process.env.ENRICH_WORKER_ENABLED !== 'false') {
    try {
      startEnrichmentWorker();
    } catch (err: unknown) {
      const error = err as Error;
      console.error('[server] failed to start enrichment worker', error?.message || err);
    }
  }

  // Use Bun's native server with Elysia
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  });

  console.log(
    `🦊 Elysia is running at http://${server.hostname}:${server.port}`
  );

  return server;
};
