/**
 * Cell Enrichment API Routes
 * 
 * Handles cell-level enrichment requests for tables.
 * Creates CellEnrichmentTask records and triggers Trigger.dev workflows.
 * 
 * This endpoint does NOT perform enrichment - it only queues tasks.
 * 
 * MVP Credit System:
 * - Each cell enrichment costs 1 credit
 * - Users must have sufficient credits to enrich cells
 */

import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { tasks, auth } from "@trigger.dev/sdk";
import { authMiddleware } from "../middleware/auth";
import { checkCredits, deductCredits, getSeatByUserId } from "../services/seat-service";
import type {
  EnrichTableRequest,
  EnrichTableResponse,
  JobStatusResponse,
  CellSelection,
} from "@repo/types";

/**
 * Validate that columns exist in the table
 */
async function validateColumns(tableId: string, columnIds: string[]) {
  const columns = await prisma.column.findMany({
    where: {
      tableId,
      id: { in: columnIds },
    },
    select: { id: true },
  });

  const foundIds = new Set(columns.map((c) => c.id));
  const missing = columnIds.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    throw new Error(`Columns not found: ${missing.join(", ")}`);
  }

  return columns;
}

/**
 * Validate that rows exist in the table
 */
async function validateRows(tableId: string, rowIds: string[]) {
  const rows = await prisma.row.findMany({
    where: {
      tableId,
      id: { in: rowIds },
    },
    select: { id: true },
  });

  const foundIds = new Set(rows.map((r) => r.id));
  const missing = rowIds.filter((id) => !foundIds.has(id));

  if (missing.length > 0) {
    throw new Error(`Rows not found: ${missing.join(", ")}`);
  }

  return rows;
}

/**
 * Expand grid mode (columnIds × rowIds) to explicit cell selections
 */
function expandGridToCells(
  columnIds: string[],
  rowIds: string[]
): CellSelection[] {
  const cells: CellSelection[] = [];

  for (const rowId of rowIds) {
    for (const columnId of columnIds) {
      cells.push({ rowId, columnId });
    }
  }

  return cells;
}

export const cellEnrichmentRoutes = new Elysia()
  // Apply auth middleware to all routes
  .use(authMiddleware)

  /**
   * POST /tables/:id/enrich
   * 
   * Trigger cell-level enrichment for a table.
   * 
   * Supports two modes:
   * 1. Grid mode: { columnIds: [...], rowIds: [...] }
   *    - Enriches all combinations of columns × rows
   * 
   * 2. Explicit mode: { cellIds: [{ rowId, columnId }, ...] }
   *    - Enriches specific cells
   * 
   * MVP Credit System:
   * - Each cell enrichment costs 1 credit
   * - Request blocked if insufficient credits
   * 
   * Response:
   * {
   *   jobId: string,
   *   tableId: string,
   *   status: "pending",
   *   totalTasks: number,
   *   message: string
   * }
   */
  .post(
    "/tables/:id/enrich",
    async ({ params: { id: tableId }, body, set, userId, isAuthenticated }) => {
      try {
        // 0. Check authentication and credits (MVP requirement)
        if (!isAuthenticated || !userId) {
          set.status = 401;
          return { error: "Authentication required to enrich cells" };
        }

        // 1. Validate table exists
        const table = await prisma.table.findUnique({
          where: { id: tableId },
        });

        if (!table) {
          set.status = 404;
          return { error: "Table not found" };
        }

        // 2. Parse and validate request
        const request = body as EnrichTableRequest;

        // Determine mode and get cell selections
        let cellSelections: CellSelection[];

        if (request.cellIds && request.cellIds.length > 0) {
          // Explicit mode: use provided cellIds
          cellSelections = request.cellIds;

          // Validate all referenced columns and rows
          const columnIds = [...new Set(cellSelections.map((c) => c.columnId))];
          const rowIds = [...new Set(cellSelections.map((c) => c.rowId))];

          await validateColumns(tableId, columnIds);
          await validateRows(tableId, rowIds);
        } else if (request.columnIds && request.rowIds) {
          // Grid mode: expand to all combinations
          await validateColumns(tableId, request.columnIds);
          await validateRows(tableId, request.rowIds);

          cellSelections = expandGridToCells(request.columnIds, request.rowIds);
        } else {
          set.status = 400;
          return { error: "Must provide either (columnIds + rowIds) or cellIds" };
        }

        if (cellSelections.length === 0) {
          set.status = 400;
          return { error: "No cells to enrich" };
        }

        // 3. Check if user has sufficient credits (1 credit per cell)
        const creditsRequired = cellSelections.length;
        const creditCheck = await checkCredits(userId, creditsRequired);

        if (!creditCheck.hasCredits) {
          set.status = 403;
          console.log(`[cell-enrich] Insufficient credits for user ${userId}. Required: ${creditsRequired}, Available: ${creditCheck.creditsRemaining}`);
          return {
            error: "Insufficient credits",
            creditsRequired,
            creditsRemaining: creditCheck.creditsRemaining,
            message: creditCheck.message,
          };
        }

        // 4. Deduct credits before creating tasks
        const newBalance = await deductCredits(userId, creditsRequired);
        if (newBalance === null) {
          set.status = 403;
          return { error: "Failed to deduct credits. Please try again." };
        }

        console.log(`[cell-enrich] Deducted ${creditsRequired} credits from user ${userId}. New balance: ${newBalance}`);

        // 5. Create EnrichmentJob and CellEnrichmentTasks in a transaction
        const result = await prisma.$transaction(async (tx) => {
          // Create the job
          const job = await tx.enrichmentJob.create({
            data: {
              tableId,
              status: "pending",
              totalTasks: cellSelections.length,
            },
          });

          // Create cell tasks in batch
          const taskData = cellSelections.map((cell) => ({
            tableId,
            rowId: cell.rowId,
            columnId: cell.columnId,
            jobId: job.id,
            status: "queued" as const,
          }));

          await tx.cellEnrichmentTask.createMany({
            data: taskData,
          });

          // Get created task IDs
          const tasks = await tx.cellEnrichmentTask.findMany({
            where: { jobId: job.id },
            select: { id: true },
          });

          // OPTIMIZATION: Initialize row counters for incremental aggregation
          // Group tasks by row to calculate totalTasks per row
          const rowTaskCounts = new Map<string, number>();
          const rowEnrichingColumns = new Map<string, Set<string>>();

          for (const cell of cellSelections) {
            rowTaskCounts.set(cell.rowId, (rowTaskCounts.get(cell.rowId) || 0) + 1);

            // Track which columns are being enriched for each row
            if (!rowEnrichingColumns.has(cell.rowId)) {
              rowEnrichingColumns.set(cell.rowId, new Set());
            }

            // Get the column key for this column ID
            const column = await tx.column.findUnique({
              where: { id: cell.columnId },
              select: { key: true },
            });

            if (column) {
              rowEnrichingColumns.get(cell.rowId)!.add(column.key);
            }
          }

          // Update each row with its task count, mark as queued, and set enriching columns
          await Promise.all(
            Array.from(rowTaskCounts.entries()).map(([rowId, taskCount]) =>
              tx.row.update({
                where: { id: rowId },
                data: {
                  status: "queued",
                  totalTasks: { increment: taskCount },
                  enrichingColumns: Array.from(rowEnrichingColumns.get(rowId) || []),
                },
              })
            )
          );

          return {
            job,
            taskIds: tasks.map((t) => t.id),
          };
        });

        // 4. Trigger the Trigger.dev workflow and get run handle for realtime updates
        let runId: string | undefined;
        let publicAccessToken: string | undefined;

        try {
          const handle = await tasks.trigger("process-enrichment-job", {
            jobId: result.job.id,
            tableId,
            taskIds: result.taskIds,
          });

          // Store the run ID
          runId = handle.id;

          // Generate a public access token for frontend realtime subscription
          // This token is scoped to only this specific run
          publicAccessToken = await auth.createPublicToken({
            scopes: {
              read: {
                runs: [handle.id],
              },
            },
            expirationTime: "1hr", // Token valid for 1 hour
          });

          console.log("[cell-enrich] Triggered workflow with run ID:", runId);
        } catch (triggerError) {
          // Log but don't fail the request - tasks are already queued
          console.error(
            "[cell-enrich] Failed to trigger workflow:",
            triggerError
          );
          // Update job to note the trigger failure
          await prisma.enrichmentJob.update({
            where: { id: result.job.id },
            data: {
              error: "Failed to trigger workflow. Tasks queued but not processing.",
            },
          });
        }

        // 5. Return response with realtime subscription info
        const response: EnrichTableResponse = {
          jobId: result.job.id,
          tableId,
          status: "pending",
          totalTasks: cellSelections.length,
          message: `Created ${cellSelections.length} enrichment tasks`,
          runId,
          publicAccessToken,
        };

        set.status = 201;
        return response;
      } catch (err) {
        console.error("[cell-enrich] Error:", err);
        set.status = 500;
        return {
          error: err instanceof Error ? err.message : "Internal server error"
        };
      }
    },
    {
      body: t.Object({
        columnIds: t.Optional(t.Array(t.String())),
        rowIds: t.Optional(t.Array(t.String())),
        cellIds: t.Optional(
          t.Array(
            t.Object({
              rowId: t.String(),
              columnId: t.String(),
            })
          )
        ),
      }),
    }
  )

  /**
   * GET /tables/:id/enrich/jobs/:jobId
   * 
   * Get the status of an enrichment job
   */
  .get("/tables/:id/enrich/jobs/:jobId", async ({ params, set }) => {
    const { id: tableId, jobId } = params;

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

    const progress =
      job.totalTasks > 0
        ? Math.round(((job.doneTasks + job.failedTasks) / job.totalTasks) * 100)
        : 0;

    const response: JobStatusResponse = {
      jobId: job.id,
      status: job.status,
      totalTasks: job.totalTasks,
      doneTasks: job.doneTasks,
      failedTasks: job.failedTasks,
      progress,
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
    };

    return response;
  })

  /**
   * GET /tables/:id/enrich/jobs
   * 
   * List all enrichment jobs for a table
   */
  .get(
    "/tables/:id/enrich/jobs",
    async ({ params, query, set }) => {
      const { id: tableId } = params;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 20;
      const skip = (page - 1) * limit;

      // Verify table exists
      const table = await prisma.table.findUnique({
        where: { id: tableId },
      });

      if (!table) {
        set.status = 404;
        return { error: "Table not found" };
      }

      const [jobs, total] = await Promise.all([
        prisma.enrichmentJob.findMany({
          where: { tableId },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.enrichmentJob.count({ where: { tableId } }),
      ]);

      return {
        data: jobs.map((job) => ({
          jobId: job.id,
          status: job.status,
          totalTasks: job.totalTasks,
          doneTasks: job.doneTasks,
          failedTasks: job.failedTasks,
          progress:
            job.totalTasks > 0
              ? Math.round(
                ((job.doneTasks + job.failedTasks) / job.totalTasks) * 100
              )
              : 0,
          createdAt: job.createdAt.toISOString(),
          startedAt: job.startedAt?.toISOString() ?? null,
          completedAt: job.completedAt?.toISOString() ?? null,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
    }
  )

  /**
   * GET /tables/:id/enrich/jobs/:jobId/tasks
   * 
   * Get tasks for a specific enrichment job
   */
  .get(
    "/tables/:id/enrich/jobs/:jobId/tasks",
    async ({ params, query, set }) => {
      const { id: tableId, jobId } = params;
      const page = Number(query.page) || 1;
      const limit = Number(query.limit) || 50;
      const skip = (page - 1) * limit;
      const status = query.status;

      // Verify job exists
      const job = await prisma.enrichmentJob.findFirst({
        where: { id: jobId, tableId },
      });

      if (!job) {
        set.status = 404;
        return { error: "Job not found" };
      }

      const whereClause = {
        jobId,
        ...(status ? { status: status as any } : {}),
      };

      const [tasks, total] = await Promise.all([
        prisma.cellEnrichmentTask.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
          include: {
            column: {
              select: { key: true, label: true },
            },
          },
        }),
        prisma.cellEnrichmentTask.count({ where: whereClause }),
      ]);

      return {
        data: tasks.map((task) => ({
          taskId: task.id,
          rowId: task.rowId,
          columnId: task.columnId,
          columnKey: task.column.key,
          columnLabel: task.column.label,
          status: task.status,
          result: task.result,
          confidence: task.confidence,
          error: task.error,
          attempts: task.attempts,
          createdAt: task.createdAt.toISOString(),
          startedAt: task.startedAt?.toISOString() ?? null,
          completedAt: task.completedAt?.toISOString() ?? null,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    },
    {
      query: t.Object({
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
        status: t.Optional(t.String()),
      }),
    }
  );

/**
 * Register cell enrichment routes
 */
export const registerCellEnrichmentRoutes = (app: Elysia) =>
  app.use(cellEnrichmentRoutes);
