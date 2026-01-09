-- Enable Row Level Security for all tables
-- This ensures users can only access their own data

-- =====================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================

ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_enrichment_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE seats ENABLE ROW LEVEL SECURITY;

-- =====================================
-- 2. TABLES POLICIES
-- =====================================

-- Users can only see their own tables
CREATE POLICY "Users can view their own tables"
ON tables FOR SELECT
USING (auth.uid()::text = "userId");

-- Users can only create tables for themselves
CREATE POLICY "Users can create their own tables"
ON tables FOR INSERT
WITH CHECK (auth.uid()::text = "userId");

-- Users can only update their own tables
CREATE POLICY "Users can update their own tables"
ON tables FOR UPDATE
USING (auth.uid()::text = "userId");

-- Users can only delete their own tables
CREATE POLICY "Users can delete their own tables"
ON tables FOR DELETE
USING (auth.uid()::text = "userId");

-- =====================================
-- 3. COLUMNS POLICIES (via table ownership)
-- =====================================

-- Users can only see columns from their tables
CREATE POLICY "Users can view columns from their tables"
ON columns FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = columns."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- Users can only create columns in their tables
CREATE POLICY "Users can create columns in their tables"
ON columns FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = columns."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- Users can only update columns in their tables
CREATE POLICY "Users can update columns in their tables"
ON columns FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = columns."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- Users can only delete columns from their tables
CREATE POLICY "Users can delete columns from their tables"
ON columns FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = columns."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- =====================================
-- 4. ROWS POLICIES (via table ownership)
-- =====================================

-- Users can only see rows from their tables
CREATE POLICY "Users can view rows from their tables"
ON rows FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = rows."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- Users can only create rows in their tables
CREATE POLICY "Users can create rows in their tables"
ON rows FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = rows."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- Users can only update rows in their tables
CREATE POLICY "Users can update rows in their tables"
ON rows FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = rows."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- Users can only delete rows from their tables
CREATE POLICY "Users can delete rows from their tables"
ON rows FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = rows."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- =====================================
-- 5. ENRICHMENT JOBS POLICIES (via table ownership)
-- =====================================

CREATE POLICY "Users can view enrichment jobs from their tables"
ON enrichment_jobs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = enrichment_jobs."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can create enrichment jobs in their tables"
ON enrichment_jobs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = enrichment_jobs."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update enrichment jobs in their tables"
ON enrichment_jobs FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = enrichment_jobs."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- =====================================
-- 6. CELL ENRICHMENT TASKS POLICIES (via table ownership)
-- =====================================

CREATE POLICY "Users can view cell tasks from their tables"
ON cell_enrichment_tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = cell_enrichment_tasks."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can create cell tasks in their tables"
ON cell_enrichment_tasks FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = cell_enrichment_tasks."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

CREATE POLICY "Users can update cell tasks in their tables"
ON cell_enrichment_tasks FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM tables
    WHERE tables.id = cell_enrichment_tasks."tableId"
    AND tables."userId" = auth.uid()::text
  )
);

-- =====================================
-- 7. SEATS POLICIES
-- =====================================

-- Users can only view their own seat
CREATE POLICY "Users can view their own seat"
ON seats FOR SELECT
USING (auth.uid()::text = "userId");

-- Users can only update their own seat (for credit usage)
CREATE POLICY "Users can update their own seat"
ON seats FOR UPDATE
USING (auth.uid()::text = "userId");

-- =====================================
-- 8. SERVICE ROLE BYPASS
-- =====================================

-- Allow service role (backend) to bypass RLS for background tasks
-- This is already handled by Supabase when using service role key

-- =====================================
-- VERIFICATION QUERIES
-- =====================================

-- Check RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd as "Command"
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
