/**
 * DB-Native Operations
 * 
 * Optimized database operations using PostgreSQL-native features.
 * Replaces read-modify-write JSON merges with atomic updates.
 * 
 * Key optimizations:
 * - jsonb_set for atomic field updates (no lost updates under concurrency)
 * - Batch updates using PostgreSQL arrays
 * - Row-level locking strategies
 */

import { logger } from '@trigger.dev/sdk';
import { getPrisma } from './db';
import type { Prisma } from '@prisma/client';

// ============ Types ============

export interface CellUpdate {
    rowId: string;
    columnKey: string;
    value: unknown;
    confidence: number;
    source: string;
}

export interface BulkRowUpdate {
    rowId: string;
    updates: Record<string, unknown>;
}

// ============ Atomic JSONB Updates ============

/**
 * Atomically update a single field in a row's JSONB data
 * Uses PostgreSQL's jsonb_set to avoid read-modify-write races
 */
export async function atomicJsonbUpdate(
    rowId: string,
    columnKey: string,
    value: unknown
): Promise<void> {
    const prisma = await getPrisma();

    // Use raw SQL for atomic jsonb_set operation
    await prisma.$executeRaw`
        UPDATE rows 
        SET 
            data = jsonb_set(
                COALESCE(data, '{}'::jsonb), 
                ${[columnKey]}::text[], 
                ${JSON.stringify(value)}::jsonb,
                true
            ),
            "updatedAt" = NOW()
        WHERE id = ${rowId}
    `;

    logger.info('⚡ Atomic JSONB update', { rowId, columnKey });
}

/**
 * Atomically update multiple fields in a row's JSONB data
 * More efficient than multiple single-field updates
 */
export async function atomicJsonbMultiUpdate(
    rowId: string,
    updates: Record<string, unknown>
): Promise<void> {
    const prisma = await getPrisma();

    // Build nested jsonb_set calls for each field
    // Start with the base data column and progressively set each field
    const updateEntries = Object.entries(updates);

    if (updateEntries.length === 0) return;

    // Use the || operator to merge the updates
    // This is atomic and handles concurrent updates correctly
    await prisma.$executeRaw`
        UPDATE rows 
        SET 
            data = COALESCE(data, '{}'::jsonb) || ${JSON.stringify(updates)}::jsonb,
            "updatedAt" = NOW()
        WHERE id = ${rowId}
    `;

    logger.info('⚡ Atomic JSONB multi-update', {
        rowId,
        fieldCount: updateEntries.length
    });
}

/**
 * Bulk update multiple rows with their respective JSONB updates
 * Uses a single query with CASE statements for efficiency
 */
export async function bulkAtomicJsonbUpdate(
    updates: BulkRowUpdate[]
): Promise<void> {
    if (updates.length === 0) return;

    const prisma = await getPrisma();

    // For bulk updates, we use a different approach:
    // Convert updates to a JSON array and use lateral joins
    const updateData = updates.map(u => ({
        id: u.rowId,
        updates: u.updates,
    }));

    // Use a CTE to update multiple rows efficiently
    await prisma.$executeRaw`
        UPDATE rows AS r
        SET 
            data = COALESCE(r.data, '{}'::jsonb) || (u.updates)::jsonb,
            "updatedAt" = NOW()
        FROM (
            SELECT 
                (value->>'id')::uuid AS id,
                (value->'updates') AS updates
            FROM jsonb_array_elements(${JSON.stringify(updateData)}::jsonb)
        ) AS u
        WHERE r.id = u.id
    `;

    logger.info('⚡ Bulk atomic JSONB update', {
        rowCount: updates.length,
        totalFields: updates.reduce((sum, u) => sum + Object.keys(u.updates).length, 0)
    });
}

// ============ Counter Updates ============

/**
 * Atomically increment row counters
 * Avoids the need to read current values first
 */
export async function atomicIncrementRowCounters(
    rowId: string,
    increments: {
        doneTasks?: number;
        failedTasks?: number;
        runningTasks?: number;
        confidenceSum?: number;
    }
): Promise<{
    totalTasks: number;
    doneTasks: number;
    failedTasks: number;
    runningTasks: number;
    confidenceSum: number;
}> {
    const prisma = await getPrisma();

    // Use raw SQL for atomic increment and return new values
    const result = await prisma.$queryRaw<Array<{
        totalTasks: number;
        doneTasks: number;
        failedTasks: number;
        runningTasks: number;
        confidenceSum: number;
    }>>`
        UPDATE rows 
        SET 
            "doneTasks" = "doneTasks" + ${increments.doneTasks ?? 0},
            "failedTasks" = "failedTasks" + ${increments.failedTasks ?? 0},
            "runningTasks" = "runningTasks" + ${increments.runningTasks ?? 0},
            "confidenceSum" = "confidenceSum" + ${increments.confidenceSum ?? 0},
            "updatedAt" = NOW()
        WHERE id = ${rowId}
        RETURNING "totalTasks", "doneTasks", "failedTasks", "runningTasks", "confidenceSum"
    `;

    if (!result[0]) {
        throw new Error(`Row not found: ${rowId}`);
    }

    return result[0];
}

/**
 * Atomically update row status based on counter values
 * Combines counter increment with status recalculation in one query
 */
export async function atomicUpdateRowStatusFromCounters(
    rowId: string,
    increments: {
        doneTasks?: number;
        failedTasks?: number;
        runningTasks?: number;
        confidenceSum?: number;
    },
    dataUpdates?: Record<string, unknown>
): Promise<{
    status: string;
    confidence: number;
}> {
    const prisma = await getPrisma();

    // Calculate new status in SQL using the counter-based logic from @repo/types
    // Status priority: running > failed > done > queued > idle
    const result = await prisma.$queryRaw<Array<{
        status: string;
        confidence: number;
    }>>`
        UPDATE rows 
        SET 
            data = COALESCE(data, '{}'::jsonb) || COALESCE(${dataUpdates ? JSON.stringify(dataUpdates) : '{}'}::jsonb, '{}'::jsonb),
            "doneTasks" = "doneTasks" + ${increments.doneTasks ?? 0},
            "failedTasks" = "failedTasks" + ${increments.failedTasks ?? 0},
            "runningTasks" = "runningTasks" + ${increments.runningTasks ?? 0},
            "confidenceSum" = "confidenceSum" + ${increments.confidenceSum ?? 0},
            "lastRunAt" = NOW(),
            "status" = CASE
                WHEN "runningTasks" + ${increments.runningTasks ?? 0} > 0 THEN 'running'
                WHEN "failedTasks" + ${increments.failedTasks ?? 0} > 0 
                     AND "doneTasks" + ${increments.doneTasks ?? 0} + "failedTasks" + ${increments.failedTasks ?? 0} >= "totalTasks" THEN 'failed'
                WHEN "doneTasks" + ${increments.doneTasks ?? 0} >= "totalTasks" THEN 'done'
                WHEN "doneTasks" + ${increments.doneTasks ?? 0} > 0 OR "failedTasks" + ${increments.failedTasks ?? 0} > 0 THEN 'running'
                ELSE 'idle'
            END,
            "confidence" = CASE
                WHEN "doneTasks" + ${increments.doneTasks ?? 0} > 0 
                THEN ("confidenceSum" + ${increments.confidenceSum ?? 0}) / ("doneTasks" + ${increments.doneTasks ?? 0})
                ELSE 0
            END,
            "updatedAt" = NOW()
        WHERE id = ${rowId}
        RETURNING status::text, confidence
    `;

    if (!result[0]) {
        throw new Error(`Row not found: ${rowId}`);
    }

    return result[0];
}

// ============ Transaction Helpers ============

/**
 * Execute a cell enrichment update with optimistic concurrency
 * Uses row-level locking to prevent lost updates
 */
export async function updateCellEnrichmentAtomic(
    taskId: string,
    result: {
        value: unknown;
        confidence: number;
        source: string;
    }
): Promise<{ rowId: string; columnKey: string }> {
    const prisma = await getPrisma();

    // Get task info and lock the row in a single query
    const taskInfo = await prisma.$queryRaw<Array<{
        rowId: string;
        columnKey: string;
        jobId: string;
    }>>`
        SELECT 
            t."rowId",
            c.key AS "columnKey",
            t."jobId"
        FROM cell_enrichment_tasks t
        JOIN columns c ON t."columnId" = c.id
        WHERE t.id = ${taskId}
        FOR UPDATE OF t
    `;

    if (!taskInfo[0]) {
        throw new Error(`Task not found: ${taskId}`);
    }

    const { rowId, columnKey, jobId } = taskInfo[0];

    // Perform atomic updates in parallel
    await Promise.all([
        // Update task status
        prisma.cellEnrichmentTask.update({
            where: { id: taskId },
            data: {
                status: 'done',
                result: result as unknown as object,
                confidence: result.confidence,
                completedAt: new Date(),
            },
        }),

        // Atomic JSONB update for row data + counter increment
        atomicUpdateRowStatusFromCounters(
            rowId,
            {
                doneTasks: 1,
                runningTasks: -1,
                confidenceSum: result.confidence,
            },
            { [columnKey]: result.value }
        ),

        // Increment job counter
        prisma.$executeRaw`
            UPDATE enrichment_jobs 
            SET "doneTasks" = "doneTasks" + 1, "updatedAt" = NOW()
            WHERE id = ${jobId}
        `,
    ]);

    logger.info('⚡ Atomic cell enrichment update complete', {
        taskId,
        rowId,
        columnKey
    });

    return { rowId, columnKey };
}

// ============ Batch Cell Updates ============

/**
 * Bulk update multiple cells atomically
 * Much more efficient than individual updates for batch enrichment
 */
export async function bulkUpdateCellsAtomic(
    updates: CellUpdate[]
): Promise<void> {
    if (updates.length === 0) return;

    const prisma = await getPrisma();

    // Group updates by rowId for efficient JSONB merging
    const rowUpdates = new Map<string, Record<string, unknown>>();
    const confidenceByRow = new Map<string, number>();

    for (const update of updates) {
        const existing = rowUpdates.get(update.rowId) ?? {};
        existing[update.columnKey] = update.value;
        rowUpdates.set(update.rowId, existing);

        const currentConfidence = confidenceByRow.get(update.rowId) ?? 0;
        confidenceByRow.set(update.rowId, currentConfidence + update.confidence);
    }

    // Convert to bulk update format
    const bulkUpdates: BulkRowUpdate[] = Array.from(rowUpdates.entries()).map(
        ([rowId, updates]) => ({ rowId, updates })
    );

    // Execute bulk update
    await bulkAtomicJsonbUpdate(bulkUpdates);

    logger.info('⚡ Bulk cell update complete', {
        cellCount: updates.length,
        rowCount: bulkUpdates.length,
    });
}
