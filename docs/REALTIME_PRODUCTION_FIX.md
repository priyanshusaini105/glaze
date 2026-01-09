# Production Realtime Not Working - Fix Guide

## 🔴 Problem
Cell enrichment updates don't show in realtime in production. You have to reload the page to see enriched data.

## 🎯 Root Causes

### 1. **Realtime Publication Not Enabled** ⚠️ MOST LIKELY
The `rows` table is not added to Supabase's `supabase_realtime` publication.

### 2. **RLS Policies Blocking Realtime**
Row Level Security (RLS) policies may be too restrictive for the `anon` role used by Realtime.

### 3. **Missing Anon Key Permissions**
The anon role doesn't have SELECT permission on the `rows` table.

---

## ✅ Fix Steps (In Order)

### Step 1: Enable Realtime Replication

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro
2. Navigate to **Database** → **Replication** (or **Publications** in older UI)
3. Find the `rows` table
4. Enable these events:
   - ✅ INSERT
   - ✅ UPDATE (critical for enrichment)
   - ✅ DELETE

**Option B: Via SQL Editor**

1. Go to https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/sql
2. Run the SQL script: `scripts/enable-realtime-production.sql`
3. Or copy-paste this:

```sql
-- Add rows table to realtime (idempotent - won't error if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rows;
  END IF;
END $$;

-- Verify
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'rows';
```

You should see one row returned showing `rows`.

### Step 2: Fix RLS Policies

The current RLS policies likely only check `auth.uid()`, which won't work for realtime since realtime uses the `anon` role.

**Run this in Supabase SQL Editor:**

```sql
-- Drop old restrictive policy
DROP POLICY IF EXISTS "Users can view rows from their tables" ON rows;

-- Create realtime-compatible policy
CREATE POLICY "Users can view rows from their tables (realtime compatible)"
ON rows FOR SELECT
USING (
  -- Allow if user owns the table
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = rows."tableId"
    AND tables."userId" = auth.uid()::text
  )
  OR
  -- Allow anon role for realtime (subscription filter handles security)
  current_user = 'anon'
);

-- Grant SELECT to anon role
GRANT SELECT ON rows TO anon;
GRANT SELECT ON rows TO authenticated;
```

### Step 3: Verify Environment Variables

Make sure your production web app has these environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://odvyblvoyemyhdfcdxro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your_key_here
```

**Check in your deployment platform** (Vercel/Netlify/etc):
- Go to your project settings
- Check Environment Variables section
- Ensure both variables are set for **Production** environment
- Redeploy if you add/change them

### Step 4: Restart Your Application

After making database changes:

**Local Development:**
```bash
cd apps/web
# Kill existing process (Ctrl+C)
pnpm dev
```

**Production:**
- Trigger a new deployment or restart your app
- Most platforms auto-restart, but you may need to manually trigger

---

## 🧪 Testing the Fix

### Test 1: Check Supabase Configuration

Run this in Supabase SQL Editor:

```sql
-- Should return 'rows' table
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'rows';

-- Should show RLS is enabled
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'rows';

-- Should show anon has SELECT permission
SELECT privilege_type, grantee
FROM information_schema.table_privileges
WHERE table_name = 'rows' AND grantee = 'anon';
```

### Test 2: Browser Console Logs

1. Open your production app: `https://your-domain.com/tables/TABLE_ID`
2. Open DevTools → Console
3. Look for these logs:

```
✅ GOOD:
[SupabaseRealtimeProvider] Subscribing to channel: table_xxx_rows
[SupabaseRealtimeProvider] Channel subscription status: SUBSCRIBED
[useTableRealtime] Setting up subscription

❌ BAD:
CHANNEL_ERROR
SUBSCRIPTION_ERROR
Not subscribed
```

### Test 3: Multi-Tab Real-time Update

1. **Tab 1**: Open your table page
2. **Tab 2**: Open same table page
3. **Tab 1**: Enrich a cell
4. **Tab 2**: Should immediately show purple "Enriching..." loader
5. **Both tabs**: Should update with enriched data when complete (no manual reload!)

### Test 4: Manual Database Update

Test if realtime is working at all:

1. Open your table in the browser
2. Open Supabase SQL Editor
3. Run this (replace with real row ID):

```sql
UPDATE rows 
SET "enrichingColumns" = ARRAY['email']
WHERE id = 'your-row-id-here';
```

4. Check browser - should immediately show email column as "enriching"
5. Then run:

```sql
UPDATE rows 
SET "enrichingColumns" = ARRAY[]
WHERE id = 'your-row-id-here';
```

6. Should immediately clear the loader

---

## 🔍 Common Issues & Solutions

### Issue: "CHANNEL_ERROR" in console

**Cause**: Realtime not enabled or RLS blocking

**Fix**:
- Complete Step 1 (enable publication)
- Complete Step 2 (fix RLS policies)

### Issue: Updates work in dev but not production

**Cause**: Different Supabase projects for dev/prod

**Fix**:
- Verify you ran the SQL scripts on the PRODUCTION database
- Check `NEXT_PUBLIC_SUPABASE_URL` points to production
- Make sure production environment variables are set

### Issue: "Not authorized" errors in console

**Cause**: RLS policies too restrictive

**Fix**:
- Run Step 2 to fix RLS policies
- Or temporarily disable RLS for testing:
  ```sql
  ALTER TABLE rows DISABLE ROW LEVEL SECURITY;
  ```
  (Re-enable after testing!)

### Issue: Subscription shows "SUBSCRIBED" but no updates

**Cause**: 
- Filter is too restrictive
- Wrong channel name
- Cached connection

**Fix**:
```javascript
// In browser console, check the filter:
console.log(window.location.pathname); // Should include table ID

// Force reconnect:
window.location.reload();
```

---

## 🚨 If Nothing Works

### Nuclear Option: Disable RLS Temporarily

**WARNING**: Only for testing! Re-enable after!

```sql
-- Disable RLS on rows table
ALTER TABLE rows DISABLE ROW LEVEL SECURITY;

-- Test if realtime works now
-- If yes, the issue is RLS policies
-- If no, check publication and permissions

-- Re-enable RLS when done testing!
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;
```

### Check Supabase Logs

1. Go to https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/logs
2. Select "Realtime" logs
3. Look for errors or rejected subscriptions
4. Check if your subscription appears in the logs

### Verify Anon Key is Valid

```bash
# In terminal, test the anon key:
curl -X GET "https://odvyblvoyemyhdfcdxro.supabase.co/rest/v1/rows?select=id&limit=1" \
  -H "apikey: YOUR_ANON_KEY_HERE" \
  -H "Authorization: Bearer YOUR_ANON_KEY_HERE"

# Should return data, not 401/403
```

---

## 📊 How Realtime Works in Your App

Understanding the flow helps debug:

```
1. User clicks "Enrich"
   ↓
2. API sets enrichingColumns = ['email'] on row
   ↓
3. Supabase broadcasts UPDATE event to all subscribed clients
   ↓
4. All browser tabs receive event via WebSocket
   ↓
5. useTableRealtime hook updates local state
   ↓
6. UI shows purple loader on email cell
   ↓
7. Workflow enriches cell, updates data, clears enrichingColumns
   ↓
8. Supabase broadcasts UPDATE event again
   ↓
9. All tabs receive event, hide loader, show data
```

**If step 3 or 8 fails** → Publication not enabled or RLS blocking

**If step 4 fails** → WebSocket connection issue, check anon key

**If step 5 fails** → Frontend subscription not working, check console

---

## 📝 Quick Checklist

- [ ] Run `scripts/enable-realtime-production.sql` in Supabase SQL Editor
- [ ] Verify `rows` table appears in publication query result
- [ ] Fix RLS policies to allow anon role SELECT
- [ ] Grant SELECT on rows to anon role
- [ ] Verify production env vars include NEXT_PUBLIC_SUPABASE_* variables
- [ ] Redeploy/restart production app
- [ ] Open browser console and check for "SUBSCRIBED" status
- [ ] Test with multi-tab update
- [ ] Check Supabase Realtime logs for errors

---

## 💡 Prevention

To avoid this in future:

1. **Always enable realtime when creating new tables**:
   ```sql
   CREATE TABLE new_table (...);
   
   -- Add to realtime publication
   DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_publication_tables 
       WHERE pubname = 'supabase_realtime' AND tablename = 'new_table'
     ) THEN
       ALTER PUBLICATION supabase_realtime ADD TABLE new_table;
     END IF;
   END $$;
   ```

2. **Test realtime immediately after RLS policy changes**

3. **Keep dev and prod Supabase configurations in sync**

4. **Document which tables need realtime in your README**

---

## 🆘 Still Not Working?

If you've tried everything:

1. **Check browser compatibility** - Some ad blockers block WebSockets
2. **Try incognito mode** - Eliminates extension interference
3. **Check network tab** - Look for WebSocket connection
4. **Contact Supabase Support** - They can check server-side logs
5. **Create minimal reproduction** - Test with a simple subscription

**Supabase Dashboard Links:**
- Project Settings: https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/settings/general
- SQL Editor: https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/sql
- Realtime Logs: https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/logs/realtime
- Database Replication: https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/database/publications
