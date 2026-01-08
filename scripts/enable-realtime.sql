-- Enable Supabase Realtime for the rows table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/sql

-- 1. Add the rows table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE rows;

-- 2. Verify it's enabled
SELECT 
  schemaname,
  tablename,
  'rows' as table_name,
  'enabled' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'rows';

-- Expected output: One row showing 'rows' table is enabled

-- 3. Optional: Check all enabled tables
SELECT tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
