/**
 * Cell Enrichment API Routes
 * 
 * Handles cell-level enrichment requests for tables.
 * Creates CellEnrichmentTask records and triggers Trigger.dev workflows.
 * 
 * This endpoint does NOT perform enrichment - it only queues tasks.
 */

import { Elysia, t } from "elysia";
import { prisma } from "../db";
import { tasks } from "@trigger.dev/sdk/v3";
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
    async ({ params: { id: tableId }, body, error, set }) => {
      try {
        // 1. Validate table exists
        const table = await prisma.table.findUnique({
          where: { id: tableId },
        });

        if (!table) {
          set.status = 404;
          return error(404, "Table not found");
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
          return error(
            400,
            "Must provide either (columnIds + rowIds) or cellIds"
          );
        }

        if (cellSelections.length === 0) {
          set.status = 400;
          return error(400, "No cells to enrich");
        }

        // 3. Create EnrichmentJob and CellEnrichmentTasks in a transaction
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

          // Mark affected rows as queued
          const uniqueRowIds = [...new Set(cellSelections.map((c) => c.rowId))];
          await tx.row.updateMany({
            where: { id: { in: uniqueRowIds } },
            data: { status: "queued" },
          });

          return {
            job,
            taskIds: tasks.map((t) => t.id),
          };
        });

        // 4. Trigger the Trigger.dev workflow (fire-and-forget)
        // We use triggerAndForget to not block the API response
        try {
          await tasks.trigger("process-enrichment-job", {
            jobId: result.job.id,
            tableId,
            taskIds: result.taskIds,
          });
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

        // 5. Return response
        const response: EnrichTableResponse = {
          jobId: result.job.id,
          tableId,
          status: "pending",
          totalTasks: cellSelections.length,
          message: `Created ${cellSelections.length} enrichment tasks`,
        };

        set.status = 201;
        return response;
      } catch (err) {
        console.error("[cell-enrich] Error:", err);
        set.status = 500;
        return error(
          500,
          err instanceof Error ? err.message : "Internal server error"
        );
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
  .get("/tables/:id/enrich/jobs/:jobId", async ({ params, error, set }) => {
    const { id: tableId, jobId } = params;

    const job = await prisma.enrichmentJob.findFirst({
      where: {
        id: jobId,
        tableId,
      },
    });

    if (!job) {
      set.status = 404;
      return error(404, "Job not found");
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
    async ({ params, query, error, set }) => {
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
        return error(404, "Table not found");
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
    async ({ params, query, error, set }) => {
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
        return error(404, "Job not found");
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
