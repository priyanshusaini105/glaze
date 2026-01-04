/**
 * Typed API Client using Eden Treaty
 * Provides type-safe API calls with proper error handling
 * 
 * Note: This file requires the API to be running or built for type inference.
 */

import { treaty } from '@elysiajs/eden';

// Type stub - update this when using Eden client
type App = any;

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = treaty<App>(API_URL, {
  fetch: {
    credentials: 'include',
  },
});

// Type-safe helper to unwrap Eden responses
export async function unwrap<T>(promise: Promise<{ data: T; error: any }>) {
  const result = await promise;
  if (result.error) {
    throw new Error(result.error.message || 'API request failed');
  }
  return result.data;
}
