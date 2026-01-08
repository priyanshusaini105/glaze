# ⚡ Quick Realtime Fix

## The Problem
Updates in one tab don't appear in other tabs.

## The Test

I created a test page to diagnose the issue.

### 1. Open Test Page
```
http://localhost:3000/test-realtime
```

### 2. Check Status

**If it says:** `✅ SUBSCRIBED - Listening for changes`
- Good! Realtime is working. Move to Step 3.

**If it says:** `❌ CHANNEL_ERROR` or stuck on "Initializing"
- Problem with Supabase credentials. Check your `.env.local`

**If it subscribes but shows 0 events:**
- Move to "Enable Database Events" below

### 3. Test Events

With test page open:
1. Open table in another tab
2. Edit any cell
3. Check test page - should show the event

**Event appears?** ✅ Great! Realtime is fully working.  
**No event?** ⬇️ Follow the fix below.

---

## The Fix: Enable Database Events

Supabase Realtime for database changes needs to be enabled.

### Option 1: Disable RLS (Quick Test)

Run this in Supabase SQL Editor:
https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/sql/new

```sql
-- Temporarily disable Row Level Security
ALTER TABLE rows DISABLE ROW LEVEL SECURITY;
```

Then refresh your test page and try again.

⚠️ This is just for testing. Re-enable later with policies.

### Option 2: Check Realtime Settings

The location varies by Supabase version. Look for:

- **Database** → **Publications** or **Replication**
- **Project Settings** → **API** → **Realtime** 
- **Realtime** in the sidebar

Enable for the `rows` table if you find it.

### Option 3: Use SQL

If you can't find the UI:

```sql
-- Add rows table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rows;

-- Verify
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

Should list `rows` in the results.

---

## What I Changed

✅ Created test page: `/test-realtime`  
✅ Added logging to see what's happening  
✅ Fixed state updates in table page  

---

## Report Back

After trying the test page, tell me:

1. **Status shown**: SUBSCRIBED / ERROR / stuck?
2. **Events received**: Yes / No
3. **Browser console errors**: Any red errors?

This will tell me exactly what to fix next!
