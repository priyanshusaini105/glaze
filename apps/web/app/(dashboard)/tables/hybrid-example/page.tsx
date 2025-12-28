/**
 * Example: Hybrid approach - SSR + Client-side React Query
 * Shows how to prefetch data on server and hydrate on client
 */

import {
  HydrationBoundary,
  QueryClient,
  dehydrate,
} from '@tanstack/react-query';
import { serverApi } from '@/lib/server-api';
import { queryKeys } from '@/lib/query-client';
import { TablesClientComponent } from './tables-client';

export default async function HybridTablesPage() {
  // Create a new QueryClient for this request
  const queryClient = new QueryClient();

  // Prefetch data on server
  await queryClient.prefetchQuery({
    queryKey: queryKeys.tables.all,
    queryFn: () => serverApi.getTables(),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {/* Client component can now use the prefetched data */}
      <TablesClientComponent />
    </HydrationBoundary>
  );
}
