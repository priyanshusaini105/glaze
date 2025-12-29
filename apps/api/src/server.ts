import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { registerIcpRoutes } from './routes/icps';
import { tablesRoutes } from './routes/tables';

export const buildApp = () => {
  const app = new Elysia()
    .use(cors())
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Glaze API',
            version: '0.2.0',
            description: 'Spreadsheet-style tables, columns, and rows backed by Prisma'
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
      version: '0.2.0',
      endpoints: {
        health: '/health',
        icps: '/icps',
        resolveIcp: '/icps/resolve',
        tables: '/tables',
        docs: '/docs'
      }
    }))
    .use(tablesRoutes)
    .use(registerIcpRoutes);

  return app;
};

export const startServer = (port = Number(process.env.PORT) || 3001) => {
  const app = buildApp();

  // Use Bun's native server
  const server = Bun.serve({
    port,
    fetch: app.fetch.bind(app),
  });

  console.log(
    `🦊 Elysia is running at http://${server.hostname}:${server.port}`
  );

  return server;
};
