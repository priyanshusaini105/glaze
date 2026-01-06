import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const connectionString = process.env.DATABASE_URL!;

// Configure connection pool with proper limits
const pool = new pg.Pool({
  connectionString,
  max: 20,                      // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,     // Close idle clients after 30 seconds
  connectionTimeoutMillis: 5000, // Fail fast if can't connect within 5s
  statement_timeout: 10000,      // Kill queries that take longer than 10s
});

const adapter = new PrismaPg(pool);

// Export pool for monitoring
export { pool };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    // Only log queries in development, and only warnings/errors in production
    log: process.env.NODE_ENV === 'production'
      ? ['warn', 'error']
      : ['query', 'info', 'warn', 'error'],
    adapter,
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
