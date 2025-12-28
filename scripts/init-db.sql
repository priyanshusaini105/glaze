-- Database initialization script
-- This runs when PostgreSQL container starts for the first time

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- You can add additional initialization scripts here
-- For example, creating tables, loading seed data, etc.

COMMENT ON DATABASE glaze_db IS 'Glaze - Agentic Spreadsheet Database';
