import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';

const app = new Elysia()
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

export default app;
