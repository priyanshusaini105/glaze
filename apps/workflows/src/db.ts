/**
 * Database client for Trigger.dev workflows
 * 
 * Uses lazy initialization to avoid Prisma initialization errors
 * when the file is imported during Trigger.dev task registration.
 * 
 * Uses @prisma/adapter-pg for Prisma v7 compatibility.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

// Lazy-initialized Prisma client
let prismaInstance: PrismaClient | null = null;
let poolInstance: pg.Pool | null = null;

/**
 * Get Prisma client instance (lazy initialization)
 * 
 * This pattern avoids the PrismaClientInitializationError that occurs
 * when PrismaClient is constructed at module load time in Trigger.dev.
 */
export function getPrisma(): PrismaClient {
    if (!prismaInstance) {
        const connectionString = process.env.DATABASE_URL!;

        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        // Optimized pool for serverless/cloud workers
        // Single connection per worker to avoid pool overhead
        poolInstance = new pg.Pool({
            connectionString,
            max: 1,                     // Single connection for serverless
            idleTimeoutMillis: 60000,   // 60s idle timeout
            connectionTimeoutMillis: 5000, // 5s connection timeout
            statement_timeout: 30000,   // 30s statement timeout
        });
        const adapter = new PrismaPg(poolInstance);

        prismaInstance = new PrismaClient({
            log: ['error'],  // Minimal logging for performance
            adapter,
        });
    }
    return prismaInstance;
}

/**
 * Disconnect Prisma client (for cleanup)
 */
export async function disconnectPrisma(): Promise<void> {
    if (prismaInstance) {
        await prismaInstance.$disconnect();
        prismaInstance = null;
    }
    if (poolInstance) {
        await poolInstance.end();
        poolInstance = null;
    }
}

