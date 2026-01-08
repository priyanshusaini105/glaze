# Realtime Troubleshooting Guide

## Issue: Updates in one tab don't reflect in another tab

### Root Cause Analysis

The realtime feature depends on **Supabase Realtime Replication** being enabled for the `rows` table. If updates don't appear across tabs, the most common cause is that replication is not enabled in your Supabase project.

---

## ✅ Fix Steps

### 1. Enable Supabase Realtime Replication

**In Supabase Dashboard:**

1. Go to https://supabase.com/dashboard
2. Select your project (odvyblvoyemyhdfcdxro)
3. Navigate to **Database** → **Replication** (or **Publications** in older UI)
4. Find the `rows` table in the list
5. Enable replication by checking these events:
   - ✅ `INSERT`
   - ✅ `UPDATE` (most important for enrichment)
   - ✅ `DELETE`

**Alternative: Enable via SQL**

If you can't find the Replication UI, run this in the SQL Editor:

```sql
-- Enable realtime for rows table
ALTER PUBLICATION supabase_realtime ADD TABLE rows;

-- Verify it's enabled
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

You should see `rows` in the results.

### 2. Verify Environment Variables

Ensure your `apps/web/.env.local` has the correct Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://odvyblvoyemyhdfcdxro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

To verify they're loaded:

```bash
cd apps/web
grep NEXT_PUBLIC_SUPABASE .env.local
```

### 3. Restart the Web App

After enabling replication and verifying env vars:

```bash
# Kill the existing web server
# Then restart
cd apps/web
bun run dev
```

---

## 🧪 Testing Realtime

### Test 1: Check Console Logs

1. Open your table page: `http://localhost:3000/tables/YOUR_TABLE_ID`
2. Open browser DevTools Console
3. Look for these logs:
   ```
   [SupabaseRealtimeProvider] Subscribing to channel: table_YOUR_TABLE_ID_rows
   [SupabaseRealtimeProvider] Channel subscription status: SUBSCRIBED
   [useTableRealtime] Setting up subscription
   ```

4. If you see `CHANNEL_ERROR` or no subscription logs, replication is not enabled.

### Test 2: Multi-Tab Update Test

1. **Open Tab 1**: `http://localhost:3000/tables/YOUR_TABLE_ID`
2. **Open Tab 2**: Same URL in a new tab
3. **In Tab 1**: Select a cell and trigger enrichment
4. **Watch Tab 2**: Should show purple "Enriching..." loader **immediately**
5. **After enrichment completes**: Both tabs should show the enriched data

### Test 3: Direct Cell Edit

1. **Open Tab 1** and **Tab 2** with the same table
2. **In Tab 1**: Double-click a cell and type some text
3. Blur the input (click outside)
4. **Watch Tab 2**: Should update with the new value within 1-2 seconds

---

## 🐛 Debugging Commands

### Check Supabase Connection

```bash
cd apps/web
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)"
```

### Check Realtime Status in Console

Open DevTools console and run:

```javascript
// Check if Supabase client is initialized
console.log('Supabase:', window.supabase);

// Check active channels
console.log('Active channels:', window.supabase?.realtime?.channels);
```

### Monitor Realtime Events

Add this to the table page temporarily to see all events:

```typescript
useEffect(() => {
  const channel = supabase
    .channel('debug-channel')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'rows' },
      (payload) => {
        console.log('🔔 Realtime event:', payload);
      }
    )
    .subscribe((status) => {
      console.log('🔌 Debug channel status:', status);
    });
  
  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## 📝 Expected Console Logs

### On Page Load

```
[SupabaseRealtimeProvider] Subscribing to channel: table_abc123_rows
[SupabaseRealtimeProvider] Setting up postgres_changes listener: {
  event: '*',
  schema: 'public',
  table: 'rows',
  filter: 'tableId=eq.abc123'
}
[SupabaseRealtimeProvider] Channel subscription status: SUBSCRIBED
[useTableRealtime] Setting up subscription: { channelName: 'table_abc123_rows', tableId: 'abc123' }
```

### On Cell Update (from API/workflow)

```
[SupabaseRealtimeProvider] postgres_changes event: {
  channelName: 'table_abc123_rows',
  eventType: 'UPDATE',
  table: 'rows',
  hasNew: true,
  hasOld: true
}
[useTableRealtime] Row UPDATE event received: {
  rowId: 'row-456',
  enrichingColumns: ['company_name'],
  dataKeys: ['company_name', 'website'],
  timestamp: '2026-01-08T...'
}
[Realtime] Row update received: {
  rowId: 'row-456',
  enrichingColumns: ['company_name'],
  data: { company_name: 'Acme Corp', website: 'https://acme.com' }
}
[Realtime] Updated rowData state: { id: 'row-456', data: {...}, enrichingColumns: ['company_name'] }
```

---

## 🚨 Common Issues

### Issue: No subscription logs appear

**Cause**: Realtime replication not enabled  
**Fix**: Enable replication in Supabase Dashboard (see step 1)

### Issue: `CHANNEL_ERROR` in console

**Cause**: Invalid Supabase credentials or network issue  
**Fix**: 
1. Check `.env.local` has correct credentials
2. Restart web server
3. Check network connectivity to Supabase

### Issue: Subscription works but updates don't appear

**Cause**: `onRowUpdate` callback not updating state correctly  
**Fix**: Already fixed with improved logging and state merge

### Issue: Updates appear in one tab but with delay

**Cause**: Normal - Supabase realtime has ~100-500ms latency  
**Expected**: This is acceptable for realtime features

---

## ✅ Success Indicators

You'll know realtime is working when:

1. ✅ Console shows `SUBSCRIBED` status
2. ✅ Purple "Enriching..." loader appears in **all open tabs** when enrichment starts
3. ✅ Enriched data appears in **all tabs** when complete (no manual refresh needed)
4. ✅ Cell edits in one tab reflect in other tabs within 1-2 seconds
5. ✅ Connection indicator in UI shows green (connected)

---

## 📞 Still Not Working?

If you've followed all steps and it's still not working:

1. **Export console logs**: Right-click in console → Save as...
2. **Share the logs** showing:
   - Subscription attempt
   - Any error messages
   - Network requests to Supabase (Network tab)

3. **Verify Supabase project settings**:
   - Check project is not paused
   - Verify API keys are valid
   - Confirm region matches your `.env` URL

4. **Test with a minimal example**:

```typescript
// Create a test page at apps/web/app/test-realtime/page.tsx
'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TestRealtime() {
  useEffect(() => {
    const channel = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'rows' },
        (payload) => {
          console.log('✅ Realtime working! Event:', payload);
          alert('Realtime event received!');
        }
      )
      .subscribe((status) => {
        console.log('Channel status:', status);
      });
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return <div>Check console for realtime events. Update a row in the database to test.</div>;
}
```

Visit `http://localhost:3000/test-realtime` and manually update a row in Supabase Dashboard to see if the event fires.

---

## 🎯 Quick Test Command

To quickly test if realtime is working, run this SQL in Supabase Dashboard:

```sql
-- Update a row to trigger realtime event
UPDATE rows 
SET data = jsonb_set(data, '{test}', '"realtime-works"'::jsonb)
WHERE id = (SELECT id FROM rows LIMIT 1);
```

If realtime is working, you should see the update appear in all open tabs immediately.
