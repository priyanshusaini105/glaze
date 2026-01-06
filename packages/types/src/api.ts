/**
 * API Response Types
 * 
 * Shared types for API responses across all endpoints
 */

// Note: RowStatus is now defined in cell-enrichment.ts
// This legacy enum is kept for backwards compatibility but not exported
// to avoid conflicts. Use RowStatus from cell-enrichment.ts instead.
enum RowStatusLegacy {
  idle = "idle",
  queued = "queued",
  running = "running",
  done = "done",
  failed = "failed",
  ambiguous = "ambiguous",
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
