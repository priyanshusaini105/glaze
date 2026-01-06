/**
 * Cell Enrichment Types
 * 
 * Types for the cell-level enrichment system.
 * Used across API, Worker, and Workflows.
 */

import { z } from "zod";

// ===== Status Enums =====

export const RowStatus = {
  IDLE: "idle",
  QUEUED: "queued",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
  AMBIGUOUS: "ambiguous",
} as const;

export type RowStatusType = (typeof RowStatus)[keyof typeof RowStatus];

export const CellTaskStatus = {
  QUEUED: "queued",
  RUNNING: "running",
  DONE: "done",
  FAILED: "failed",
} as const;

export type CellTaskStatusType = (typeof CellTaskStatus)[keyof typeof CellTaskStatus];

export const JobStatus = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export type JobStatusType = (typeof JobStatus)[keyof typeof JobStatus];

// ===== API Request Schemas =====

/**
 * Cell selection for explicit cell targeting
 */
export const cellSelectionSchema = z.object({
  rowId: z.string().min(1, "rowId is required"),
  columnId: z.string().min(1, "columnId is required"),
});

export type CellSelection = z.infer<typeof cellSelectionSchema>;

/**
 * Enrichment request payload
 * Supports two modes:
 * 1. Grid mode: columnIds + rowIds (enriches all combinations)
 * 2. Explicit mode: cellIds (enriches specific cells)
 */
export const enrichTableRequestSchema = z
  .object({
    // Grid mode: enrich all combinations of columns × rows
    columnIds: z.array(z.string()).optional(),
    rowIds: z.array(z.string()).optional(),

    // Explicit mode: enrich specific cells
    cellIds: z.array(cellSelectionSchema).optional(),
  })
  .refine(
    (data) => {
      // Must have either (columnIds + rowIds) or cellIds
      const hasGridMode = data.columnIds && data.rowIds;
      const hasCellMode = data.cellIds && data.cellIds.length > 0;
      return hasGridMode || hasCellMode;
    },
    {
      message:
        "Must provide either (columnIds + rowIds) for grid mode, or cellIds for explicit mode",
    }
  );

export type EnrichTableRequest = z.infer<typeof enrichTableRequestSchema>;

// ===== API Response Types =====

export interface EnrichTableResponse {
  jobId: string;
  tableId: string;
  status: JobStatusType;
  totalTasks: number;
  message: string;
  /** Trigger.dev run ID for realtime subscription */
  runId?: string;
  /** Public access token for frontend realtime subscription */
  publicAccessToken?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatusType;
  totalTasks: number;
  doneTasks: number;
  failedTasks: number;
  progress: number; // 0-100
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

// ===== Workflow Payloads =====

export interface EnrichmentWorkflowPayload {
  jobId: string;
  tableId: string;
  taskIds: string[];
}

export interface EnrichCellPayload {
  taskId: string;
}

export interface EnrichCellResult {
  taskId: string;
  status: CellTaskStatusType;
  result: CellEnrichmentResult | null;
  error: string | null;
}

// ===== Cell Enrichment Result =====

export interface CellEnrichmentResult {
  value: string | number | boolean | null;
  confidence: number; // 0.0 - 1.0
  source: string; // e.g., "fake", "linkedin", "ai_inference"
  timestamp: string; // ISO 8601
  metadata?: Record<string, unknown>;
}

// ===== Row Status Aggregation =====

/**
 * Calculate row status from its cell task states
 * 
 * Rules:
 * - all done → done
 * - some failed, some done → ambiguous
 * - all failed → failed
 * - any running → running
 * - any queued (none running) → queued
 * - none created → idle
 */
export function aggregateRowStatus(
  taskStatuses: CellTaskStatusType[]
): RowStatusType {
  if (taskStatuses.length === 0) {
    return RowStatus.IDLE;
  }

  const counts = {
    queued: 0,
    running: 0,
    done: 0,
    failed: 0,
  };

  for (const status of taskStatuses) {
    counts[status]++;
  }

  const total = taskStatuses.length;

  // Any running → running
  if (counts.running > 0) {
    return RowStatus.RUNNING;
  }

  // All done → done
  if (counts.done === total) {
    return RowStatus.DONE;
  }

  // All failed → failed
  if (counts.failed === total) {
    return RowStatus.FAILED;
  }

  // Any queued (none running) → queued
  if (counts.queued > 0) {
    return RowStatus.QUEUED;
  }

  // Some done, some failed → ambiguous
  if (counts.done > 0 && counts.failed > 0) {
    return RowStatus.AMBIGUOUS;
  }

  // Default fallback
  return RowStatus.IDLE;
}

/**
 * Calculate average confidence from cell tasks
 */
export function aggregateRowConfidence(
  confidences: (number | null)[]
): number | null {
  const validConfidences = confidences.filter(
    (c): c is number => c !== null && c !== undefined
  );

  if (validConfidences.length === 0) {
    return null;
  }

  return (
    validConfidences.reduce((sum, c) => sum + c, 0) / validConfidences.length
  );
}
