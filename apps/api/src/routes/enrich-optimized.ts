/**
 * Optimized Entity-Based Enrichment API Routes
 * 
 * Production-ready enrichment endpoint that:
 * 1. Detects and deduplicates entities from rows
 * 2. Batches enrichment by entity (not cell)
 * 3. Minimizes database operations
 * 4. Provides realtime progress updates
 * 
 * This replaces the cell-level enrichment for production use.
 */

import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { tasks, auth } from "@trigger.dev/sdk";
import {
  detectEntities,
  estimateEnrichmentCost,
  type RowData,
  type ColumnData,
} from "../services/entity-detection";

// ===== Local Types (to avoid import issues during development) =====

interface OptimizedJobMetadata {
  entityCount: number;
  cellCount: number;
  entitiesByType: {
    company: number;
    person: number;
    unknown: number;
  };
  cost: {
    totalCents: number;
    breakdown: Array<{
      source: string;
      count: number;
      costCents: number;
    }>;
  };
  stats: {
    cacheHits: number;
    apiCalls: number;
    duplicatesAvoided: number;
    processingTimeMs: number;
  };
}

interface SerializedEntity {
  entityId: string;
  type: string;
  identifier: string;
  normalizedIdentifier: string;
  requestedFields: string[];
  targetCells: Array<{ rowId: string; columnKey: string }>;
  sourceData?: Record<string, unknown>;
}

interface EntityEnrichmentPayload {
  jobId: string;
  tableId: string;
  entities: SerializedEntity[];
  budgetPerEntityCents: number;
  skipCache: boolean;
}

interface OptimizedEnrichResponse {
  jobId: string;
  tableId: string;
  status: string;
  entityCount: number;
  cellCount: number;
  estimatedCostCents: number;
  message: string;
  runId?: string;
  publicAccessToken?: string;
}

// ===== Request Validation Schema =====

const enrichRequestSchema = t.Object({
  columnIds: t.Array(t.String(), { minItems: 1 }),
  rowIds: t.Optional(t.Array(t.String())),
  budgetCents: t.Optional(t.Number({ minimum: 0, maximum: 10000 })),
  skipCache: t.Optional(t.Boolean()),
  priority: t.Optional(t.Number({ minimum: 0, maximum: 10 })),
});

const estimateRequestSchema = t.Object({
  columnIds: t.Array(t.String(), { minItems: 1 }),
  rowIds: t.Optional(t.Array(t.String())),
});

// ===== Helper: Serialize entity map =====

function serializeEntityMap(entityMap: Map<string, any>): SerializedEntity[] {
  return Array.from(entityMap.values()).map(entity => ({
    entityId: entity.entityId,
    type: entity.type,
    identifier: entity.identifier,
    normalizedIdentifier: entity.normalizedIdentifier,
    requestedFields: entity.requestedFields,
    targetCells: entity.targetCells,
    sourceData: entity.sourceData,
  }));
}

// ===== Routes =====

export const optimizedEnrichmentRoutes = new Elysia({ prefix: "/v2" })
  /**
   * POST /v2/tables/:id/enrich
   * 
   * Optimized entity-based enrichment endpoint.
   * 
   * Key optimizations:
   * - Entity detection & deduplication
   * - Single database transaction for job creation
   * - Batch processing in Trigger.dev
   * - Minimal database operations
   */
  .post(
    "/tables/:id/enrich",
    async ({ params: { id: tableId }, body, set }) => {
      const startTime = Date.now();
      
      try {
        // 1. Validate table exists
        const table = await prisma.table.findUnique({
          where: { id: tableId },
          select: { id: true, name: true },
        });

        if (!table) {
          set.status = 404;
          return { error: "Table not found" };
        }

        // 2. Load columns
        const columns = await prisma.column.findMany({
          where: {
            tableId,
            id: { in: body.columnIds },
          },
          select: {
            id: true,
            key: true,
            label: true,
          },
        });

        if (columns.length !== body.columnIds.length) {
          const foundIds = new Set(columns.map(c => c.id));
          const missing = body.columnIds.filter(id => !foundIds.has(id));
          set.status = 400;
          return { error: `Columns not found: ${missing.join(", ")}` };
        }

        // 3. Load rows (all or specified)
        const rowWhere = body.rowIds?.length
          ? { tableId, id: { in: body.rowIds } }
          : { tableId };

        const rows = await prisma.row.findMany({
          where: rowWhere,
          select: {
            id: true,
            data: true,
          },
        });

        if (rows.length === 0) {
          set.status = 400;
          return { error: "No rows found to enrich" };
        }

        // 4. Detect entities (the key optimization!)
        const detectionResult = detectEntities(
          rows as RowData[],
          columns as ColumnData[]
        );

        console.log("[v2/enrich] Entity detection:", {
          rows: rows.length,
          columns: columns.length,
          entities: detectionResult.stats.uniqueEntities,
          duplicates: detectionResult.stats.duplicatesFound,
          cellsPerEntity: detectionResult.stats.cellsPerEntity.toFixed(1),
        });

        // 5. Estimate cost
        const costEstimate = estimateEnrichmentCost(detectionResult.entityMap);

        // Check budget
        if (body.budgetCents && costEstimate.totalCents > body.budgetCents) {
          set.status = 400;
          return {
            error: `Estimated cost (${costEstimate.totalCents}¢) exceeds budget (${body.budgetCents}¢)`,
          };
        }

        // 6. Create job with metadata (single DB operation)
        const jobMetadata: OptimizedJobMetadata = {
          entityCount: detectionResult.stats.uniqueEntities,
          cellCount: detectionResult.stats.totalCells,
          entitiesByType: detectionResult.stats.entitiesByType,
          cost: {
            totalCents: 0,
            breakdown: [],
          },
          stats: {
            cacheHits: 0,
            apiCalls: 0,
            duplicatesAvoided: detectionResult.stats.duplicatesFound,
            processingTimeMs: 0,
          },
        };

        const job = await prisma.enrichmentJob.create({
          data: {
            tableId,
            status: "pending",
            totalTasks: detectionResult.stats.uniqueEntities,
            // Store metadata in a way that works with current schema
            // We'll store detailed metadata in error field temporarily
            // In production, add a metadata JSONB column
            error: JSON.stringify(jobMetadata),
          },
        });

        // 7. Mark rows as queued (bulk update)
        const rowIds = [...new Set(rows.map(r => r.id))];
        await prisma.row.updateMany({
          where: { id: { in: rowIds } },
          data: { status: "queued" },
        });

        // 8. Serialize entities for Trigger.dev
        const serializedEntities = serializeEntityMap(detectionResult.entityMap);

        // 9. Trigger the optimized workflow
        let runId: string | undefined;
        let publicAccessToken: string | undefined;

        try {
          const payload: EntityEnrichmentPayload = {
            jobId: job.id,
            tableId,
            entities: serializedEntities,
            budgetPerEntityCents: body.budgetCents
              ? Math.floor(body.budgetCents / detectionResult.stats.uniqueEntities)
              : 50, // Default 50 cents per entity
            skipCache: body.skipCache ?? false,
          };

          const handle = await tasks.trigger("process-entity-enrichment", payload);

          runId = handle.id;

          // Generate public access token for realtime subscription
          publicAccessToken = await auth.createPublicToken({
            scopes: {
              read: {
                runs: [handle.id],
              },
            },
            expirationTime: "1hr",
          });

          console.log("[v2/enrich] Triggered workflow:", {
            runId,
            entityCount: serializedEntities.length,
            estimatedCost: costEstimate.totalCents,
          });

          // Update job status
          await prisma.enrichmentJob.update({
            where: { id: job.id },
            data: { status: "running", startedAt: new Date() },
          });
        } catch (triggerError) {
          console.error("[v2/enrich] Failed to trigger workflow:", triggerError);
          
          await prisma.enrichmentJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              error: `Trigger failed: ${triggerError instanceof Error ? triggerError.message : "Unknown error"}`,
            },
          });

          // Reset row statuses
          await prisma.row.updateMany({
            where: { id: { in: rowIds } },
            data: { status: "idle" },
          });

          throw triggerError;
        }

        // 10. Return response
        const response: OptimizedEnrichResponse = {
          jobId: job.id,
          tableId,
          status: "enriching",
          entityCount: detectionResult.stats.uniqueEntities,
          cellCount: detectionResult.stats.totalCells,
          estimatedCostCents: costEstimate.totalCents,
          message: `Enriching ${detectionResult.stats.uniqueEntities} unique entities → ${detectionResult.stats.totalCells} cells (${detectionResult.stats.duplicatesFound} duplicates avoided)`,
          runId,
          publicAccessToken,
        };

        const processingTime = Date.now() - startTime;
        console.log("[v2/enrich] Request processed in", processingTime, "ms");

        set.status = 201;
        return response;
      } catch (err) {
        console.error("[v2/enrich] Error:", err);
        set.status = 500;
        return { error: err instanceof Error ? err.message : "Unknown error" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: enrichRequestSchema,
    }
  )

  /**
   * GET /v2/tables/:tableId/jobs/:jobId
   * 
   * Get optimized job status with entity-level progress
   */
  .get(
    "/tables/:tableId/jobs/:jobId",
    async ({ params: { tableId, jobId }, set }) => {
      const job = await prisma.enrichmentJob.findFirst({
        where: {
          id: jobId,
          tableId,
        },
      });

      if (!job) {
        set.status = 404;
        return { error: "Job not found" };
      }

      // Parse metadata from error field (temporary storage)
      let metadata: OptimizedJobMetadata | null = null;
      try {
        if (job.error && job.error.startsWith("{")) {
          metadata = JSON.parse(job.error);
        }
      } catch {
        // Not JSON metadata, actual error
      }

      return {
        jobId: job.id,
        tableId: job.tableId,
        status: job.status,
        entityCount: metadata?.entityCount ?? job.totalTasks,
        cellCount: metadata?.cellCount ?? 0,
        processedEntities: job.doneTasks,
        failedEntities: job.failedTasks,
        progress: job.totalTasks > 0
          ? Math.round((job.doneTasks / job.totalTasks) * 100)
          : 0,
        stats: metadata?.stats ?? null,
        cost: metadata?.cost ?? null,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
      };
    },
    {
      params: t.Object({
        tableId: t.String(),
        jobId: t.String(),
      }),
    }
  )

  /**
   * POST /v2/tables/:id/enrich/estimate
   * 
   * Estimate enrichment cost without starting a job
   */
  .post(
    "/tables/:id/enrich/estimate",
    async ({ params: { id: tableId }, body, set }) => {
      try {
        // Load columns
        const columns = await prisma.column.findMany({
          where: {
            tableId,
            id: { in: body.columnIds },
          },
          select: {
            id: true,
            key: true,
            label: true,
          },
        });

        if (columns.length !== body.columnIds.length) {
          set.status = 400;
          return { error: "Some columns not found" };
        }

        // Load rows
        const rowWhere = body.rowIds?.length
          ? { tableId, id: { in: body.rowIds } }
          : { tableId };

        const rows = await prisma.row.findMany({
          where: rowWhere,
          select: { id: true, data: true },
        });

        // Detect entities
        const detectionResult = detectEntities(
          rows as RowData[],
          columns as ColumnData[]
        );

        // Estimate cost
        const costEstimate = estimateEnrichmentCost(detectionResult.entityMap);

        return {
          totalRows: rows.length,
          totalColumns: columns.length,
          totalCells: detectionResult.stats.totalCells,
          uniqueEntities: detectionResult.stats.uniqueEntities,
          duplicatesFound: detectionResult.stats.duplicatesFound,
          entitiesByType: detectionResult.stats.entitiesByType,
          estimatedCostCents: costEstimate.totalCents,
          costBreakdown: costEstimate.breakdown,
          // Comparison with cell-based approach
          comparison: {
            cellBasedCost: detectionResult.stats.totalCells * 10, // Assuming 10¢ per cell
            entityBasedCost: costEstimate.totalCents,
            savings: Math.round(
              ((detectionResult.stats.totalCells * 10 - costEstimate.totalCents) /
                (detectionResult.stats.totalCells * 10)) *
                100
            ),
          },
          warnings: detectionResult.warnings,
        };
      } catch (err) {
        set.status = 500;
        return { error: err instanceof Error ? err.message : "Unknown error" };
      }
    },
    {
      params: t.Object({ id: t.String() }),
      body: estimateRequestSchema,
    }
  );
