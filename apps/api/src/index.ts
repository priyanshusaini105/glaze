import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

// Named export avoids Bun auto-starting a dev server on port 3000.
export const app = new Elysia()
  .use(cors())
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'glaze-api',
    uptime: process.uptime()
  }))
  .get('/', () => ({
    message: 'Welcome to Glaze API',
    version: '0.1.0',
    endpoints: {
      health: '/health'
    }
  }))
  .listen(process.env.PORT || 3001);

console.log(
  `🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`
);
