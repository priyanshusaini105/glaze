/**
 * Type-safe Eden client for Glaze API
 * 
 * Provides end-to-end type safety between frontend and backend
 */

import { treaty } from '@elysiajs/eden';
import type { App } from '../../../api/src/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Create Eden client with full type safety
 * 
 * Usage:
 * ```ts
 * const { data, error } = await api.effect.enrich.post({
 *   url: 'https://example.com',
 *   userId: 'user-123',
 *   budgetCents: 100
 * });
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
