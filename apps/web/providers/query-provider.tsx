/**
 * React Query Provider
 * Wraps the app with QueryClientProvider for data fetching
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/query-client';
import { ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const isDev = process.env.NODE_ENV === 'development';
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
