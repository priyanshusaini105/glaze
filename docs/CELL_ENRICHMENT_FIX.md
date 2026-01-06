# Cell Enrichment Bug Fix

## Problem
When selecting multiple cells (e.g., 2 cells) for enrichment, the system was enriching more cells than intended. For example:
- Selecting cells A1 and B2 would enrich all 4 cells: A1, A2, B1, B2
- This happened because the frontend was using "grid mode" which creates a cartesian product of all column IDs × row IDs

## Root Cause
The frontend code in `/apps/web/app/(dashboard)/tables/[tableId]/page.tsx` was collecting unique `columnIds` and `rowIds` from the selection and sending them to the backend API. The backend API supports two modes:

1. **Grid Mode**: `{ columnIds: [...], rowIds: [...] }` - Enriches ALL combinations (cartesian product)
2. **Explicit Mode**: `{ cellIds: [{ rowId, columnId }, ...] }` - Enriches ONLY the specific cells provided

The frontend was incorrectly using Grid Mode for all selections.

## Solution
Changed the frontend to use **Explicit Mode** instead:

### Changes Made

1. **Frontend Table Page** (`/apps/web/app/(dashboard)/tables/[tableId]/page.tsx`):
   - Modified `handleRunEnrichment` function to build an explicit `cellIds` array
   - Each selected cell is now added as `{ rowId, columnId }` to the array
   - Removed the grid mode logic that collected unique columnIds and rowIds

2. **API Client Types** (`/apps/web/lib/typed-api-client.ts`):
   - Updated `startCellEnrichment` method signature to accept both modes:
     - `{ columnIds: string[]; rowIds: string[] }` (Grid mode)
     - `{ cellIds: Array<{ rowId: string; columnId: string }> }` (Explicit mode)

3. **TypeScript Fixes**:
   - Added null checks when extracting rowId from cell keys to prevent undefined errors

## Testing
To test the fix:
1. Select 2 specific cells in the table (e.g., different rows and columns)
2. Click "Run selected cells"
3. Verify that only those 2 cells are enriched (check the backend logs and database)
4. Previously, it would have enriched all combinations (4 cells in a 2×2 grid)

## Backend API (No Changes Required)
The backend API already supported both modes correctly:
- `/apps/api/src/routes/cell-enrich.ts` - Handles both grid and explicit modes
- `/apps/workflows/src/cell-enrichment.ts` - Processes individual cell tasks

The backend logic remains unchanged and continues to work correctly.
