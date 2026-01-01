# Enrichment Migration Guide: Simulation → Production

This guide walks you through upgrading from simulated enrichment to real production enrichment.

## Prerequisites

Before migrating to production:

- [ ] Backend enrichment services are fully implemented
- [ ] API keys for external services are available
- [ ] Database is configured for caching enrichment results
- [ ] Testing budget is allocated
- [ ] Error handling and retry logic are implemented

## Migration Steps

### Step 1: Backend Preparation

Ensure the backend enrichment pipeline is ready:

1. **Check service implementations**:
   - `apps/api/src/services/search-service.ts` - Search API integration
   - `apps/api/src/services/contactout-client.ts` - ContactOut API
   - `apps/api/src/services/enrichment-pipeline.ts` - Full pipeline

2. **Verify environment variables**:

```bash
# apps/api/.env
SERPER_API_KEY=your_serper_key
CONTACTOUT_API_KEY=your_contactout_key
# Add other service keys as needed
```

3. **Test backend endpoints**:

```bash
# Test enrichment endpoint
curl -X POST http://localhost:3001/enrich \
  -H "Content-Type: application/json" \
  -d '{
    "dataType": "cell",
    "cellValue": "https://example.com",
    "requiredFields": ["company_name"],
    "mock": false
  }'
```

### Step 2: Frontend Configuration

Update the enrichment config:

**File**: `apps/web/lib/enrichment-config.ts`

```typescript
export const enrichmentConfig = {
  // Change mode from simulation to production
  mode: 'production',

  // Keep delays enabled for better UX
  simulateDelay: false,

  // Set appropriate budget
  defaultBudgetCents: 100, // $1.00

  // Enable auto-save when ready
  autoSaveResults: false, // Start with false, test first

  // Enable services
  services: {
    search: {
      enabled: true,
      provider: 'serper',
      costPerQuery: 1,
    },
    contactOut: {
      enabled: true,
      costPerLookup: 50,
    },
    linkedin: {
      enabled: true,
      costPerScrape: 25,
    },
    websiteScrape: {
      enabled: true,
      costPerScrape: 10,
    },
  },

  // Configure field mapping
  fieldMapping: {
    autoDetect: true,
    custom: {
      // Map enrichment fields to your table columns
      // Example:
      // 'company_name': 'company',
      // 'person_email': 'email',
    },
  },

  // UI settings
  ui: {
    showSimulationBadge: false, // Hide simulation badge
    showCostEstimates: true,
    showConfidenceScores: true,
    enableSmartFieldSelection: true,
  },

  // Advanced options
  advanced: {
    maxConcurrentOperations: 5,
    retryOnFailure: true,
    maxRetries: 3,
    timeout: 30000,
  },
};
```

### Step 3: Implement Auto-Save (Optional)

To automatically save enrichment results to table cells:

**File**: `apps/web/app/(dashboard)/tables/[tableId]/page.tsx`

Update the `handleEnrichmentComplete` function:

```typescript
const handleEnrichmentComplete = useCallback(async (result: EnrichmentResponse) => {
  console.log('Enrichment complete:', result);
  
  if (!enrichmentConfig.autoSaveResults) {
    // Just show notification
    alert(`Enrichment complete! ${result.meta.itemsEnriched} items enriched`);
    return;
  }

  // Auto-save logic
  try {
    if (result.dataType === 'cell') {
      // Update single cell
      const cellResult = result as EnrichmentCellResult;
      // TODO: Map enriched fields to table columns and update
      
    } else if (result.dataType === 'array') {
      // Update multiple cells
      const arrayResult = result as EnrichmentArrayResult;
      // TODO: Batch update cells
      
    } else if (result.dataType === 'column') {
      // Update entire column
      const columnResult = result as EnrichmentColumnResult;
      // TODO: Update all rows in column
      
    } else if (result.dataType === 'row') {
      // Update entire row
      const rowResult = result as EnrichmentRowResult;
      // TODO: Update all fields in row
    }
    
    // Reload table data
    await loadData();
  } catch (error) {
    console.error('Failed to save enrichment results:', error);
    alert('Enrichment completed but failed to save results. Please try again.');
  }
}, [loadData]);
```

### Step 4: Testing Plan

**Phase 1: Smoke Test (Budget: $0.10)**

1. Enable production mode with minimal budget:
```typescript
defaultBudgetCents: 10, // $0.10
```

2. Test each enrichment type:
   - Single cell enrichment
   - Array enrichment (2-3 items)
   - Column enrichment (small column)
   - Row enrichment

3. Verify:
   - [ ] API calls are being made
   - [ ] Results are accurate
   - [ ] Costs match expectations
   - [ ] Error handling works
   - [ ] Cache is working

**Phase 2: Small Batch Test (Budget: $1.00)**

1. Increase budget:
```typescript
defaultBudgetCents: 100, // $1.00
```

2. Test with realistic data:
   - 10-20 cells
   - Mix of company and person fields
   - Various data qualities

3. Monitor:
   - Response times
   - Success rates
   - Cost per enrichment
   - Cache hit rates

**Phase 3: Production Rollout (Budget: Custom)**

1. Set appropriate budget:
```typescript
defaultBudgetCents: 500, // $5.00 or higher
```

2. Enable auto-save:
```typescript
autoSaveResults: true,
```

3. Roll out to users with:
   - Clear cost documentation
   - Usage limits
   - Monitoring and alerts

### Step 5: Monitoring & Optimization

**Add Monitoring**:

1. Track enrichment usage:
```typescript
// Add to handleEnrichmentComplete
analytics.track('enrichment_completed', {
  dataType: result.dataType,
  itemsEnriched: result.meta.itemsEnriched,
  costCents: result.meta.costCents,
  durationMs: result.meta.durationMs,
});
```

2. Set up cost alerts:
   - Daily spending limits
   - Per-user limits
   - Anomaly detection

**Optimize Performance**:

1. Review cache hit rates:
```bash
# Check cache stats
curl http://localhost:3001/enrich/cache
```

2. Adjust cache TTL if needed:
```typescript
cacheTTLDays: 7, // Increase for better cache utilization
```

3. Tune concurrent operations:
```typescript
maxConcurrentOperations: 10, // Increase for faster bulk enrichments
```

### Step 6: User Documentation

Update user-facing documentation:

1. **Pricing information**:
   - Cost per enrichment type
   - Budget recommendations
   - Cost-saving tips (use cache, batch operations)

2. **Best practices**:
   - When to use each enrichment type
   - How to interpret confidence scores
   - How to handle failed enrichments

3. **Troubleshooting**:
   - Common errors
   - Support contact
   - FAQ

## Rollback Plan

If issues arise, you can quickly rollback:

1. **Immediate rollback**:
```typescript
// apps/web/lib/enrichment-config.ts
export const enrichmentConfig = {
  mode: 'simulation', // Back to simulation
  // ... rest of config
};
```

2. **Disable auto-save**:
```typescript
autoSaveResults: false,
```

3. **Disable specific services**:
```typescript
services: {
  contactOut: {
    enabled: false, // Disable problematic service
  },
}
```

## Post-Migration Checklist

After successful migration:

- [ ] All enrichment types working in production
- [ ] Auto-save feature tested and working
- [ ] Cost tracking and budgets configured
- [ ] User documentation updated
- [ ] Monitoring and alerts set up
- [ ] Support team trained
- [ ] Backup/rollback plan tested
- [ ] Cache optimization reviewed
- [ ] Performance benchmarks met

## Support & Resources

- **Backend Implementation**: `apps/api/src/services/enrichment-*`
- **Frontend Config**: `apps/web/lib/enrichment-config.ts`
- **API Documentation**: `http://localhost:3001/docs`
- **Integration Guide**: `docs/ENRICHMENT_INTEGRATION.md`

For questions or issues during migration, consult the development team.
