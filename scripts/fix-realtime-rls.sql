-- Fix Realtime: Disable Row Level Security on rows table
-- This allows Supabase Realtime to broadcast changes to all clients

-- Check current RLS status
SELECT 
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'rows';

-- Disable RLS (for development/testing)
ALTER TABLE rows DISABLE ROW LEVEL SECURITY;

-- Verify it's disabled
SELECT 
  tablename,
  rowsecurity as "RLS Enabled (should be false)"
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'rows';

-- Expected output: rowsecurity = false
