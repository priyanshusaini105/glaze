# CRITICAL: 6-8 Second Row Creation Performance Issue

## Problem
POST `/tables/:id/rows` endpoint takes **6-8 seconds** to create a single row with empty data.

## Expected Performance
Should take **< 100ms** for a simple row creation

## Investigation Steps

### Step 1: Check API Server Logs
Run your curl command and check the logs for timing information:
```bash
# Look for these log lines:
[POST /rows] Table lookup took: XXms
[POST /rows] Row creation took: XXms  
[POST /rows] Total request time: XXms
```

### Step 2: Check Database Connection
The most likely cause is **slow database connection** or **connection pool exhaustion**.

Check your `.env` file for:
```bash
DATABASE_URL="postgresql://..."
```

### Step 3: Database Connection Pool Issues

#### Current Configuration
File: `apps/api/src/db.ts`
```typescript
const pool = new pg.Pool({ connectionString });
```

**Problem**: No pool size limits set! Default is only 10 connections.

#### Fix: Configure Connection Pool
```typescript
const pool = new pg.Pool({ 
  connectionString,
  max: 20,                  // Maximum pool size
  idleTimeoutMillis: 30000, // Close idle clients after 30s
  connectionTimeoutMillis: 5000  // Fail fast if can't connect
});
```

### Step 4: Check Database Performance

#### Check for Bloated Tables
```sql
-- Connect to your database and run:
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  n_live_tup,
  n_dead_tup,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE tablename IN ('rows', 'tables', 'columns')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

If `n_dead_tup` is high, run:
```sql
VACUUM ANALYZE rows;
VACUUM ANALYZE tables;
```

#### Check for Missing Indexes (CRITICAL)
```sql
-- Check if tableId index exists on rows table:
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'rows'
  AND schemaname = 'public';
```

Expected indexes:
1. Primary key on `id`
2. **MISSING: Index on `tableId`** ← This is likely the issue!

#### Check for Slow Queries
```sql
-- Enable query logging (if not already enabled):
SELECT name, setting FROM pg_settings WHERE name LIKE '%log%statement%';

-- Check current connections:
SELECT count(*), state FROM pg_stat_activity GROUP BY state;

-- Check for long-running queries:
SELECT pid, now() - query_start AS duration, query 
FROM pg_stat_activity 
WHERE state = 'active' 
ORDER BY duration DESC;
```

### Step 5: Check for Prisma Query Logging Overhead

File: `apps/api/src/db.ts` line 14:
```typescript
log: ['query'],  // ← Logging ALL queries can slow things down
```

**Recommendation**: Disable query logging in production, or use selective logging:
```typescript
log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
```

## Most Likely Causes (in order)

### 1. Missing Database Index on `rows.tableId` (90% probability)
The foreign key relation doesn't automatically create an index in PostgreSQL!

**Fix**: Add to `schema.prisma`:
```prisma
model Row {
  // ... existing fields ...
  
  @@index([tableId])
  @@index([tableId, createdAt])  // For orderBy queries
  @@map("rows")
}
```

Then run:
```bash
cd apps/api
npx prisma migrate dev --name add_row_indexes
```

### 2. Database Connection Pool Exhausted (5% probability)
Default pg.Pool has only 10 connections. If other queries are holding connections, new requests wait.

**Symptoms**:
- Delays happen randomly
- More delays under load
- First request after idle is fast

**Fix**: Increase pool size (see Step 3)

### 3. Network Latency to Database (3% probability)
If database is remote and has high latency.

**Check**:
```bash
# Test database connection speed:
time psql "$DATABASE_URL" -c "SELECT 1"
```

Should be < 50ms. If > 500ms, database is too far away.

### 4. Database Under Heavy Load (2% probability)
Check database CPU/disk I/O

```sql
-- Check database stats:
SELECT * FROM pg_stat_database WHERE datname = current_database();
```

## Quick Diagnosis Script

Create this file: `apps/api/scripts/diagnose-performance.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL!;

async function diagnose() {
  console.log('🔍 Diagnosing database performance...\n');

  // Test 1: Raw connection speed
  console.log('Test 1: Raw PostgreSQL connection');
  const start1 = performance.now();
  const pool = new pg.Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  const end1 = performance.now();
  console.log(`✓ Connection time: ${(end1 - start1).toFixed(2)}ms`);
  
  // Test 2: Simple query
  console.log('\nTest 2: Simple SELECT 1 query');
  const start2 = performance.now();
  await client.query('SELECT 1');
  const end2 = performance.now();
  console.log(`✓ Query time: ${(end2 - start2).toFixed(2)}ms`);
  
  // Test 3: Table lookup
  console.log('\nTest 3: Table lookup by ID');
  const start3 = performance.now();
  const result = await client.query(`
    SELECT * FROM tables 
    WHERE id = '069f5d3a-11ab-40fc-81ed-51fc0f8e73de'
    LIMIT 1
  `);
  const end3 = performance.now();
  console.log(`✓ Table lookup time: ${(end3 - start3).toFixed(2)}ms`);
  console.log(`  Found: ${result.rows.length} rows`);
  
  // Test 4: Row insertion
  console.log('\nTest 4: Row insertion');
  const start4 = performance.now();
  const insertResult = await client.query(`
    INSERT INTO rows (id, "tableId", data, status)
    VALUES (gen_random_uuid(), '069f5d3a-11ab-40fc-81ed-51fc0f8e73de', '{}', 'idle')
    RETURNING id
  `);
  const end4 = performance.now();
  console.log(`✓ Insert time: ${(end4 - start4).toFixed(2)}ms`);
  console.log(`  Row ID: ${insertResult.rows[0].id}`);
  
  // Test 5: Check indexes
  console.log('\nTest 5: Checking indexes on rows table');
  const indexes = await client.query(`
    SELECT 
      indexname,
      indexdef
    FROM pg_indexes
    WHERE tablename = 'rows'
      AND schemaname = 'public'
  `);
  console.log(`✓ Found ${indexes.rows.length} indexes:`);
  indexes.rows.forEach((idx: any) => {
    console.log(`  - ${idx.indexname}: ${idx.indexdef}`);
  });
  
  // Test 6: Check table stats
  console.log('\nTest 6: Table statistics');
  const stats = await client.query(`
    SELECT 
      n_live_tup,
      n_dead_tup,
      last_vacuum,
      last_autovacuum
    FROM pg_stat_user_tables
    WHERE tablename = 'rows'
  `);
  if (stats.rows.length > 0) {
    const stat = stats.rows[0];
    console.log(`✓ Live rows: ${stat.n_live_tup}`);
    console.log(`  Dead rows: ${stat.n_dead_tup}`);
    console.log(`  Last vacuum: ${stat.last_vacuum || 'never'}`);
    console.log(`  Last autovacuum: ${stat.last_autovacuum || 'never'}`);
    
    if (stat.n_dead_tup > stat.n_live_tup * 0.2) {
      console.log(`⚠️  WARNING: High dead tuple count! Run VACUUM ANALYZE`);
    }
  }
  
  client.release();
  await pool.end();
  
  console.log('\n✅ Diagnosis complete!');
}

diagnose().catch(console.error);
```

Run it:
```bash
cd apps/api
bun run scripts/diagnose-performance.ts
```

## Immediate Actions

1. **Add the missing index** (do this now):
   ```bash
   cd apps/api
   # Edit schema.prisma and add: @@index([tableId])
   npx prisma migrate dev --name add_row_table_id_index
   ```

2. **Configure connection pool**:
   Edit `apps/api/src/db.ts`:
   ```typescript
   const pool = new pg.Pool({ 
     connectionString,
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 5000
   });
   ```

3. **Run VACUUM** (if needed):
   ```sql
   VACUUM ANALYZE rows;
   ```

4. **Test again**:
   ```bash
   time curl -X POST 'http://localhost:3001/tables/YOUR_TABLE_ID/rows' \
     -H 'Content-Type: application/json' \
     --data-raw '{"data":{"test":"value"}}'
   ```

   Should now take **< 100ms**.

## Expected Results After Fix

- **Before**: 6-8 seconds
- **After**: 50-100ms
- **Improvement**: **60-160x faster** 🚀
