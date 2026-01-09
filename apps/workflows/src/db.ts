/**
 * Database client for Trigger.dev workflows
 * 
 * Uses lazy initialization AND dynamic imports to avoid loading Prisma
 * at module parse time. This prevents slow cold starts for tasks that
 * don't need database access (like hello-world).
 * 
 * Uses @prisma/adapter-pg for Prisma v7 compatibility.
 */

// Lazy-initialized Prisma client - types only, no imports at module scope
let prismaInstance: any | null = null;
let poolInstance: any | null = null;

/**
 * Get Prisma client instance (lazy initialization with dynamic imports)
 * 
 * This pattern avoids loading the heavy Prisma client until it's actually needed,
 * preventing ~20-30 second cold starts for simple tasks.
 */
export async function getPrisma(): Promise<import("@prisma/client").PrismaClient> {
    if (!prismaInstance) {
        // Dynamic imports - only load when actually needed
        const prismaModule = await import('@prisma/client');
        const adapterModule = await import('@prisma/adapter-pg');
        const pgModule = await import('pg');

        // Handle both default and named exports
        const PrismaClient = prismaModule.PrismaClient || (prismaModule as any).default?.PrismaClient;
        const PrismaPg = adapterModule.PrismaPg || (adapterModule as any).default?.PrismaPg;
        const Pool = pgModule.Pool || (pgModule as any).default?.Pool;

        if (!PrismaClient) {
            throw new Error('PrismaClient not found in @prisma/client module. Did you run `prisma generate`?');
        }

        const connectionString = process.env.DATABASE_URL!;
        
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set in Trigger.dev production');
        }

        // Log database connection info (sanitized)
        const dbHost = connectionString.match(/@([^:]+)/)?.[1] || 'unknown';
        const dbName = connectionString.match(/\/([^?]+)/)?.[1] || 'unknown';
        console.log(`[Prisma Init] Connecting to database: ${dbHost}/${dbName}`);

        // Optimized pool for serverless/cloud workers
        // Single connection per worker to avoid pool overhead
        poolInstance = new Pool({
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
            // Increase transaction timeouts for remote databases (Upstash/Neon)
            transactionOptions: {
                maxWait: 10000,  // 10s max wait for transaction to start
                timeout: 30000,  // 30s max transaction duration
            },
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

