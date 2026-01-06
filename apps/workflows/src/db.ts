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

        poolInstance = new pg.Pool({ connectionString });
        const adapter = new PrismaPg(poolInstance);

        prismaInstance = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
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

