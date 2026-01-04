/**
 * Type-safe Eden client for Glaze API
 * 
 * Provides end-to-end type safety between frontend and backend
 * 
 * Note: This file requires the API to be running or built for type inference.
 * Currently commented out to prevent build errors. Uncomment when needed.
 */

import { treaty } from '@elysiajs/eden';

// Type stub - update this when using Eden client
type App = any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Create Eden client with full type safety
 * 
 * Usage:
 * ```ts
 * const { data, error } = await api.tables.get();
 * const { data, error } = await api.tables[id].get();
 * const { data, error } = await api.tables[id].rows.post({ data: {...} });
 * ```
 */
export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: 'include',
  },
});

// Export types for convenience
export type EnrichmentInput = {
  url: string;
  userId: string;
  budgetCents: number;
};

export type EnrichmentResult = {
  success: boolean;
  data?: Record<string, unknown>;
  provider: string;
  costCents: number;
  attempts: number;
  timestamp: string;
};

export type EnrichmentResponse =
  | {
    success: true;
    result: EnrichmentResult;
  }
  | {
    success: false;
    error: string;
    message: string;
    details?: unknown;
  };
