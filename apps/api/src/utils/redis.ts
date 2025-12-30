import Redis from 'ioredis';

let singleton: Redis | null = null;
let bullmqConnection: Redis | null = null;

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

/**
 * Get a Redis connection configured for BullMQ
 * BullMQ requires maxRetriesPerRequest to be null
 */
export const getBullMQConnection = () => {
  if (!bullmqConnection) {
    bullmqConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: null, // Required for BullMQ
      enableReadyCheck: true
    });
    bullmqConnection.on('error', (err) => {
      console.error('[redis:bullmq] connection error', err?.message || err);
    });
  }

  return bullmqConnection;
};

export const closeRedisConnection = async () => {
  if (singleton) {
    await singleton.quit();
    singleton = null;
  }
  if (bullmqConnection) {
    await bullmqConnection.quit();
    bullmqConnection = null;
  }
};