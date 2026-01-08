# Realtime Fix - Testing & Setup Guide

## Problem
Cell updates in one tab don't appear in other tabs without manual reload.

## 🧪 Step 1: Test If Realtime Is Working

**Open this test page first:**
```
http://localhost:3000/test-realtime
```

This will show you if Supabase Realtime is connected and receiving database events.

### What You Should See

✅ **Success**: "✅ SUBSCRIBED - Listening for changes"  
❌ **Problem**: "❌ CHANNEL_ERROR" or stuck on "Initializing..."

### Test It

1. Keep test page open
2. Open your table in another tab
3. Update any cell
4. Check test page - should show the event

## 🔧 Step 2: Based on Test Results

### If Test Shows "SUBSCRIBED" ✅

Great! Realtime is working. The issue is just in the table page React code.

**Solution**: The logging I added will help debug. Check browser console on the table page for:
```
[useTableRealtime] Row UPDATE event received
```

### If Test Shows "CHANNEL_ERROR" ❌

**Check your `.env.local` file:**
```bash
cat apps/web/.env.local | grep SUPABASE
```

Should show:
```
NEXT_PUBLIC_SUPABASE_URL=https://odvyblvoyemyhdfcdxro.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

### If Test Subscribes But No Events

This means `postgres_changes` needs to be enabled. Unfortunately, the UI location varies by Supabase version.

**Try this SQL instead** (works on all versions):

1. Go to: https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/sql/new
2. Run:
```sql
-- Check if RLS is blocking
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'rows';

-- If rowsecurity is true, disable for testing
ALTER TABLE rows DISABLE ROW LEVEL SECURITY;
```

3. Try the test page again

## What I've Done

✅ Created test page: [test-realtime](../apps/web/app/test-realtime/page.tsx)  
✅ Added detailed logging to track events  
✅ Improved state merging in table page  
✅ Created verification script: `./scripts/verify-realtime.sh`  

## Expected Behavior

When working:

1. ✅ Test page shows "SUBSCRIBED"
2. ✅ Events appear when you update rows
3. ✅ All open tabs update simultaneously
4. ✅ No manual refresh needed

## Report Back

After visiting the test page, let me know:
1. What status does it show?
2. Do events appear when you edit a row?

This will tell us exactly what needs to be fixed!
