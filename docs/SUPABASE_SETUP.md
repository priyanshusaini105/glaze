# Supabase Setup Guide - Quick Start

## ✅ What We've Done

1. **Updated Prisma schema** to support connection pooling:
   - Added `url` and `directUrl` configuration
   - This allows Prisma to use pooled connections for queries and direct connections for migrations

2. **Configured connection pool** in `apps/api/src/db.ts`:
   - Max 20 connections
   - 30s idle timeout
   - 5s connection timeout

3. **Added performance indexes** to the database schema

---

## 🚀 Manual Setup Steps

Since you have the Supabase credentials in your root `.env`, follow these steps:

### Step 1: Update `apps/api/.env`

Copy your credentials to `apps/api/.env`:

```bash
# Database Configuration (Supabase ap-south-1)
DATABASE_URL="postgresql://postgres.odvyblvoyemyhdfcdxro:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

DIRECT_URL="postgresql://postgres.odvyblvoyemyhdfcdxro:[YOUR-PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# API Server
PORT=3001
API_URL=http://localhost:3001

# Environment
NODE_ENV=development
```

**Replace `[YOUR-PASSWORD]` with your actual Supabase password.**

### Step 2: Test the Connection

```bash
cd /home/priyanshu/dev/personal/glaze/apps/api

# Test connection
npx prisma db execute --stdin <<< "SELECT 1 as test;"
```

If successful, you'll see: `Executed in XXXms`

### Step 3: Generate Prisma Client

```bash
cd /home/priyanshu/dev/personal/glaze/apps/api
npx prisma generate
```

### Step 4: Apply Migrations

```bash
cd /home/priyanshu/dev/personal/glaze/apps/api

# Check migration status
npx prisma migrate status

# Apply migrations (if needed)
npx prisma migrate deploy
```

### Step 5: Run Performance Diagnostic

```bash
cd /home/priyanshu/dev/personal/glaze/apps/api
bun run scripts/diagnose-db-performance.ts
```

**Expected Results (ap-south-1):**
- ✅ Connection time: **< 100ms** (was 4000+ms with Neon US)
- ✅ Query time: **< 20ms** (was 250-500ms)
- ✅ Row insert: **< 50ms** (was 500-800ms)

### Step 6: Start the API Server

```bash
cd /home/priyanshu/dev/personal/glaze/apps/api
bun run dev
```

### Step 7: Test Row Creation Speed

Create a new row and measure time:

```bash
# Get a table ID first
curl http://localhost:3001/tables | jq -r '.[0].id'

# Test row creation (replace TABLE_ID)
time curl -X POST 'http://localhost:3001/tables/TABLE_ID/rows' \
  -H 'Content-Type: application/json' \
  --data-raw '{"data":{"company_name":"test","website":"https://example.com"}}'
```

**Expected time: < 100ms** (down from 6-8 seconds!)

---

## 📊 Performance Comparison

| Metric | Neon (us-east-1) | Supabase (ap-south-1) | Improvement |
|--------|------------------|----------------------|-------------|
| Connection | 4,132 ms | **< 100 ms** | **40x faster** |
| Simple Query | 263 ms | **< 20 ms** | **13x faster** |
| Table Lookup | 492 ms | **< 50 ms** | **10x faster** |
| Row Creation | 5,700 ms | **< 100 ms** | **60x faster** |

---

## 🔧 Troubleshooting

### Issue: "Connection timeout"

**Solution**: Check your firewall/network. Supabase requires outbound connections to:
- Port 6543 (pooler)
- Port 5432 (direct)

### Issue: "Authentication failed"

**Solution**: Verify your password in the connection string. Special characters may need URL encoding:
- `@` → `%40`
- `#` → `%23`
- `%` → `%25`

### Issue: "Database does not exist"

**Solution**: Supabase creates a default `postgres` database. Make sure your URL ends with `/postgres`.

### Issue: "Migrations fail"

**Solution**: 
1. Check `DIRECT_URL` is set correctly (port 5432, not 6543)
2. Verify your user has CREATE TABLE permissions
3. Try manually: `psql "$DIRECT_URL" -c "\dt"`

---

## 🎯 Next Steps

1. **Test the enrichment feature** - Should now be much faster
2. **Monitor connection pool usage** - Add logging to see connection reuse
3. **Consider adding Redis cache** - For even better performance on frequently accessed data

---

## 📈 Monitoring Tips

Add this to your `apps/api/src/server.ts` to monitor connection pool:

```typescript
import { pool } from './db'; // Export pool from db.ts

setInterval(() => {
  console.log('📊 Connection Pool Stats:', {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
}, 60000); // Every minute
```

---

## 🎉 Success Indicators

You'll know it's working when:

✅ API starts in < 2 seconds  
✅ Table page loads in < 500ms  
✅ Row creation takes < 100ms  
✅ Database diagnostic shows < 100ms connection time  
✅ No more "Loading table data..." hanging  

---

## 💡 Pro Tips

1. **Use transaction mode for migrations**: Add `?pgbouncer=true&pool_mode=transaction` to DIRECT_URL
2. **Enable statement timeout**: Already configured in `db.ts` (10s)
3. **Monitor via Supabase Dashboard**: `https://supabase.com/dashboard/project/YOUR_PROJECT/reports`

---

**Need help?** Check the diagnostic output:
```bash
cd apps/api && bun run scripts/diagnose-db-performance.ts 2>&1 | tee diagnostic-results.txt
```

Then share `diagnostic-results.txt` if you encounter issues.
