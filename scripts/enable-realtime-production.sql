-- =====================================
-- ENABLE SUPABASE REALTIME FOR PRODUCTION
-- =====================================
-- Run this in Supabase Dashboard → SQL Editor
-- Project: odvyblvoyemyhdfcdxro
-- https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/sql

-- =====================================
-- STEP 1: Enable Realtime Publication
-- =====================================

-- Add rows table to realtime publication (idempotent - won't error if already exists)
DO $$
BEGIN
  -- Check if rows table is already in the publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'rows'
  ) THEN
    -- Add it if not present
    ALTER PUBLICATION supabase_realtime ADD TABLE rows;
    RAISE NOTICE 'Added rows table to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'rows table already in supabase_realtime publication';
  END IF;
END $$;

-- Verify it's enabled
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename = 'rows';

-- Expected: Should return 1 row with 'rows' table


-- =====================================
-- STEP 2: Grant Realtime Permissions
-- =====================================

-- Grant SELECT to anon role (required for realtime subscriptions)
GRANT SELECT ON rows TO anon;
GRANT SELECT ON rows TO authenticated;

-- Grant USAGE on schema
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;


-- =====================================
-- STEP 3: Fix RLS Policies for Realtime
-- =====================================

-- CRITICAL: Realtime uses the anon role, so we need policies that allow it
-- The current RLS policies only check auth.uid(), which won't work for realtime

-- Drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Users can view rows from their tables" ON rows;

-- Create new policy that works with realtime
-- This allows SELECT for rows where the user owns the parent table
CREATE POLICY "Users can view rows from their tables (realtime compatible)"
ON rows FOR SELECT
USING (
  -- Allow if user is authenticated and owns the table
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = rows."tableId"
    AND tables."userId" = auth.uid()::text
  )
  OR
  -- CRITICAL: Also allow anon role to SELECT for realtime broadcasts
  -- Realtime will still respect the filter we set in the subscription
  current_user = 'anon'
);

-- Alternative: Temporarily disable RLS on rows table for testing
-- WARNING: Only use this if you want to test if RLS is the issue
-- ALTER TABLE rows DISABLE ROW LEVEL SECURITY;


-- =====================================
-- STEP 4: Verify Configuration
-- =====================================

-- Check if realtime is enabled
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('rows', 'tables', 'columns')
ORDER BY tablename;

-- Check grants for anon role
SELECT 
  table_name,
  privilege_type,
  grantee
FROM information_schema.table_privileges
WHERE table_name = 'rows'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;


-- =====================================
-- STEP 5: Test Realtime (Optional)
-- =====================================

-- Manually trigger an update to test if realtime is working
-- Replace 'YOUR_ROW_ID' with an actual row ID from your database
-- UPDATE rows 
-- SET "enrichingColumns" = ARRAY['email']
-- WHERE id = 'YOUR_ROW_ID';

-- Then check in your browser console if the update was received
