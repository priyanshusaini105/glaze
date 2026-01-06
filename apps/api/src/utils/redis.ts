import Redis from 'ioredis';

let singleton: Redis | null = null;
``
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const getRedisConnection = () => {
  if (!singleton) {
    singleton = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true
    });
    singleton.on('error', (err) => {
      console.error('[redis] connection error', err?.message || err);
    });
  }

  return singleton;
};

export const closeRedisConnection = async () => {
  if (singleton) {
    await singleton.quit();
    singleton = null;
  }
};