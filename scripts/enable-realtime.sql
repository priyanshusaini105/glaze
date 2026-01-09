-- Enable Supabase Realtime for the rows table
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/odvyblvoyemyhdfcdxro/sql

-- 1. Add the rows table to the realtime publication (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'rows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE rows;
    RAISE NOTICE 'Added rows table to realtime publication';
  ELSE
    RAISE NOTICE 'rows table already in realtime publication';
  END IF;
END $$;

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
