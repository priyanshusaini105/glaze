# Trigger.dev Realtime SSE Implementation

This document describes the implementation of real-time updates for cell enrichment using Trigger.dev Realtime.

## Overview

Instead of polling the API for enrichment job status, the frontend now receives live Server-Sent Events (SSE) directly from Trigger.dev when an enrichment job is running. This provides instant feedback when:

- A job starts executing
- Progress updates occur
- The job completes (success or failure)

## How It Works

### 1. Backend (API)

When an enrichment job is triggered via `POST /tables/:id/enrich`, the API now:

1. Triggers the Trigger.dev workflow using `tasks.trigger()`
2. Captures the returned run handle with `handle.id`
3. Generates a **public access token** scoped to that specific run using `auth.createPublicToken()`
4. Returns both `runId` and `publicAccessToken` in the API response

```typescript
// apps/api/src/routes/cell-enrich.ts
const handle = await tasks.trigger("process-enrichment-job", {
  jobId: result.job.id,
  tableId,
  taskIds: result.taskIds,
});

// Generate a public access token for frontend realtime subscription
publicAccessToken = await auth.createPublicToken({
  scopes: {
    read: {
      runs: [handle.id],  // Only this specific run
    },
  },
  expirationTime: "1hr",
});
```

### 2. Frontend (Web)

The frontend uses the `@trigger.dev/react-hooks` package to subscribe to real-time updates:

```typescript
// hooks/use-realtime-enrichment.ts
import { useRealtimeRun } from '@trigger.dev/react-hooks';

export function useRealtimeEnrichment(options: UseRealtimeEnrichmentOptions) {
  const { runId, publicAccessToken, onComplete } = options;
  
  const { run, error } = useRealtimeRun(runId ?? '', {
    accessToken: publicAccessToken ?? '',
    enabled: Boolean(runId && publicAccessToken),
  });
  
  // Derive status and trigger callbacks...
}
```

### 3. Table Page Integration

The table page now:

1. Starts the enrichment job and receives `runId` + `publicAccessToken`
2. Uses the `useRealtimeEnrichment` hook to subscribe to updates
3. Displays real-time status in the header (Starting... → In Queue... → Enriching... → Enriched!)
4. Automatically refreshes data when the job completes

## Files Changed

- `packages/types/src/cell-enrichment.ts` - Added `runId` and `publicAccessToken` to `EnrichTableResponse`
- `apps/api/src/routes/cell-enrich.ts` - Generate and return realtime subscription tokens
- `apps/web/lib/api-client.ts` - Updated response type
- `apps/web/lib/typed-api-client.ts` - Updated response type
- `apps/web/hooks/use-realtime-enrichment.ts` - **New** - Custom hook for realtime updates
- `apps/web/app/(dashboard)/tables/[tableId]/page.tsx` - Integrated realtime updates with UI feedback

## Dependencies Added

```bash
# Web app
bun add @trigger.dev/react-hooks
```

## Testing

1. Start the API server: `cd apps/api && bun run dev`
2. Start the Trigger.dev dev worker: `npx trigger.dev@latest dev`
3. Start the web app: `cd apps/web && npm run dev`
4. Navigate to a table page
5. Select some cells and click "Run" to start enrichment
6. Observe the status indicator in the header updating in real-time
7. Data should refresh automatically when enrichment completes

## Fallback Behavior

If the API fails to generate a `runId` or `publicAccessToken` (e.g., Trigger.dev not configured), the frontend falls back to the previous polling-based approach, ensuring backward compatibility.
