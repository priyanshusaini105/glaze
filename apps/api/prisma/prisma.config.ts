/**
 * Prisma Configuration (Prisma 7+)
 * 
 * In Prisma 7, connection URLs are configured here instead of schema.prisma
 * See: https://pris.ly/d/config-datasource
 */

import { defineConfig } from '@prisma/client';

export default defineConfig({
    // Datasource configuration
    datasources: {
        db: {
            // Pooled connection URL (uses pgbouncer for connection pooling)
            url: process.env.DATABASE_URL!,

            // Direct connection URL (for migrations that need direct DB access)
            directUrl: process.env.DIRECT_URL || process.env.DATABASE_URL!,
        },
    },
});
