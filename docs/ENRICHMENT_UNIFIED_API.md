# Unified Enrichment API Documentation

## Overview

The Glaze Enrichment API has been completely refactored to provide a single, unified endpoint for enriching table data. The new implementation supports enriching cells, rows, and columns with a consistent, flexible request/response structure.

## Endpoint

### `POST /enrich`

Enriches table data based on specified targets (cells, rows, or columns).

## Request Structure

```typescript
interface EnrichRequest {
  tableId: string;  // Identify which table to enrich
  targets: EnrichTarget[];
}

type EnrichTarget = 
  | { type: 'cells'; selections: CellSelection[] }
  | { type: 'rows'; rowIds: string[] }
  | { type: 'columns'; columnIds: string[] };

interface CellSelection {
  rowId: string;
  columnId: string;
}
```

## Response Structure

```typescript
interface EnrichResponse {
  tableId: string;  // Echo back for confirmation
  results: EnrichResult[];
  metadata: {
    processed: number;  // Total cells processed
    failed: number;     // Total cells that failed
    cost?: number;      // Cost estimate in cents
  };
}

interface EnrichResult {
  rowId: string;
  columnId: string;
  originalValue: any;
  enrichedValue: any;
  status: 'success' | 'error';
  error?: string;  // Only present if status is 'error'
}
```

## Usage Examples

### Example 1: Enrich Specific Cells

```bash
curl -X POST http://localhost:3001/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "leads_table_abc123",
    "targets": [{
      "type": "cells",
      "selections": [
        { "rowId": "user_123", "columnId": "email" },
        { "rowId": "user_456", "columnId": "company" }
      ]
    }]
  }'
```

**Response:**
```json
{
  "tableId": "leads_table_abc123",
  "results": [
    {
      "rowId": "user_123",
      "columnId": "email",
      "originalValue": null,
      "enrichedValue": "contact+1234567890@example.com",
      "status": "success"
    },
    {
      "rowId": "user_456",
      "columnId": "company",
      "originalValue": null,
      "enrichedValue": "TechCorp",
      "status": "success"
    }
  ],
  "metadata": {
    "processed": 2,
    "failed": 0,
    "cost": 20
  }
}
```

### Example 2: Enrich Entire Rows

```bash
curl -X POST http://localhost:3001/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "contacts_xyz789",
    "targets": [{
      "type": "rows",
      "rowIds": ["row_1", "row_2"]
    }]
  }'
```

**Response:**
```json
{
  "tableId": "contacts_xyz789",
  "results": [
    {
      "rowId": "row_1",
      "columnId": "email",
      "originalValue": null,
      "enrichedValue": "contact@example.com",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "phone",
      "originalValue": null,
      "enrichedValue": "+1-555-1234",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "company",
      "originalValue": null,
      "enrichedValue": "DataSync",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "title",
      "originalValue": null,
      "enrichedValue": "VP Sales",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "linkedin",
      "originalValue": null,
      "enrichedValue": "linkedin.com/in/user-xyz123",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "website",
      "originalValue": null,
      "enrichedValue": "https://example-abc123.com",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "industry",
      "originalValue": null,
      "enrichedValue": "Technology",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "employee_count",
      "originalValue": null,
      "enrichedValue": "1500",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "revenue",
      "originalValue": null,
      "enrichedValue": "$500M",
      "status": "success"
    }
  ],
  "metadata": {
    "processed": 9,
    "failed": 0,
    "cost": 90
  }
}
```

### Example 3: Enrich Entire Columns

```bash
curl -X POST http://localhost:3001/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "prospects_def456",
    "targets": [{
      "type": "columns",
      "columnIds": ["company_name", "industry"]
    }]
  }'
```

**Response:**
```json
{
  "tableId": "prospects_def456",
  "results": [
    {
      "rowId": "row_1",
      "columnId": "company_name",
      "originalValue": null,
      "enrichedValue": "TechCorp",
      "status": "success"
    },
    {
      "rowId": "row_1",
      "columnId": "industry",
      "originalValue": null,
      "enrichedValue": "Technology",
      "status": "success"
    },
    // ... results for all rows in the columns
  ],
  "metadata": {
    "processed": 20,
    "failed": 0,
    "cost": 200
  }
}
```

### Example 4: Enrich Multiple Target Types in One Request

```bash
curl -X POST http://localhost:3001/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "tableId": "mixed_table",
    "targets": [
      {
        "type": "cells",
        "selections": [
          { "rowId": "row_1", "columnId": "email" }
        ]
      },
      {
        "type": "rows",
        "rowIds": ["row_2"]
      },
      {
        "type": "columns",
        "columnIds": ["phone"]
      }
    ]
  }'
```

## Frontend Integration

### Using the API Client

```typescript
import { apiClient } from '@/lib/api-client';
import type { EnrichRequest, EnrichResponse } from '@/lib/api-types';

// Enrich cells
const enrichRequest: EnrichRequest = {
  tableId: 'my_table_id',
  targets: [{
    type: 'cells',
    selections: [
      { rowId: 'row_1', columnId: 'email' },
      { rowId: 'row_2', columnId: 'company' }
    ]
  }]
};

const response: EnrichResponse = await apiClient.enrichData(enrichRequest);

// Access results
response.results.forEach(result => {
  console.log(`${result.rowId} - ${result.columnId}: ${result.enrichedValue}`);
});

// Check metadata
console.log(`Processed: ${response.metadata.processed}, Failed: ${response.metadata.failed}`);
```

### Row Enrichment in AG Grid

```typescript
const onEnrichRow = async (rowId: string) => {
  try {
    const enrichRequest: EnrichRequest = {
      tableId,
      targets: [{
        type: 'rows',
        rowIds: [rowId]
      }]
    };
    
    const enrichResponse = await apiClient.enrichData(enrichRequest);
    
    // Update grid cells with enriched values
    const updateData: Record<string, any> = {};
    enrichResponse.results.forEach(result => {
      if (result.status === 'success') {
        updateData[result.columnId] = result.enrichedValue;
      }
    });
    
    // Persist to backend
    await apiClient.updateRow(tableId, rowId, { data: updateData });
  } catch (error) {
    console.error('Enrichment failed:', error);
  }
};
```

## Supported Enrichment Columns

When enriching rows or columns, the system currently generates enriched values for:

- `email` - Contact email addresses
- `phone` - Phone numbers (+1-555-XXXX format)
- `company` - Company names
- `title` - Job titles (CEO, CTO, VP Sales, etc.)
- `linkedin` - LinkedIn profile URLs
- `website` - Company website URLs
- `industry` - Industry classification
- `employee_count` - Number of employees
- `revenue` - Annual revenue estimates

## Cost Calculation

The cost is calculated as: **processed_cells × 10 cents**

For example:
- Enriching 2 cells = $0.20
- Enriching 1 row (9 fields) = $0.90
- Enriching 2 columns × 10 rows = $2.00

## Error Handling

If enrichment fails for a specific cell, the result will contain an error:

```json
{
  "rowId": "row_123",
  "columnId": "email",
  "originalValue": null,
  "enrichedValue": null,
  "status": "error",
  "error": "Failed to generate enriched value"
}
```

## Implementation Details

### Backend Files Modified

1. **`apps/api/src/types/enrichment.ts`** - Added new request/response types
2. **`apps/api/src/routes/enrich.ts`** - Completely refactored with single endpoint

### Frontend Files Modified

1. **`apps/web/lib/api-types.ts`** - Updated enrichment types
2. **`apps/web/lib/api-client.ts`** - Added `enrichData()` method
3. **`apps/web/components/tables/ag-grid-table.tsx`** - Updated row enrichment handler

## Next Steps for Production

1. **Integrate with Real Enrichment Services**
   - Connect to Serper API for web search
   - Add LinkedIn scraping capabilities

2. **Add Caching**
   - Implement Redis cache for enriched values
   - Set TTL-based expiration

3. **Async Processing**
   - Queue large enrichment requests
   - Implement job status tracking

4. **Rate Limiting**
   - Add request throttling per user
   - Enforce budget limits

5. **Monitoring**
   - Add comprehensive logging
   - Track enrichment success rates
   - Monitor cost per request
