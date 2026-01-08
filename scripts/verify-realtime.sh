#!/bin/bash

# Realtime Setup Verification Script
# Checks if Supabase Realtime is properly configured

set -e

echo "🔍 Checking Supabase Realtime Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Environment variables
echo "1️⃣  Checking environment variables..."
if [ -f "apps/web/.env.local" ]; then
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.local && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" apps/web/.env.local; then
    echo -e "${GREEN}✅ Supabase environment variables found${NC}"
    SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL apps/web/.env.local | cut -d '=' -f2)
    echo "   URL: $SUPABASE_URL"
  else
    echo -e "${RED}❌ Missing Supabase environment variables${NC}"
    echo "   Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to apps/web/.env.local"
    exit 1
  fi
else
  echo -e "${RED}❌ apps/web/.env.local not found${NC}"
  echo "   Create apps/web/.env.local with Supabase credentials"
  exit 1
fi

echo ""

# Check 2: Prisma schema
echo "2️⃣  Checking Prisma schema..."
if grep -q "enrichingColumns" apps/api/prisma/schema.prisma; then
  echo -e "${GREEN}✅ enrichingColumns field found in Row model${NC}"
else
  echo -e "${RED}❌ enrichingColumns field missing from Row model${NC}"
  echo "   Run: cd apps/api && npx prisma migrate dev"
  exit 1
fi

echo ""

# Check 3: Realtime provider
echo "3️⃣  Checking Realtime provider..."
if grep -q "SupabaseRealtimeProvider" apps/web/app/layout.tsx; then
  echo -e "${GREEN}✅ SupabaseRealtimeProvider found in layout${NC}"
else
  echo -e "${RED}❌ SupabaseRealtimeProvider not found in layout${NC}"
  echo "   Add SupabaseRealtimeProvider to apps/web/app/layout.tsx"
  exit 1
fi

echo ""

# Check 4: Hooks
echo "4️⃣  Checking realtime hooks..."
if [ -f "apps/web/hooks/use-table-realtime.ts" ]; then
  echo -e "${GREEN}✅ use-table-realtime.ts hook found${NC}"
else
  echo -e "${YELLOW}⚠️  use-table-realtime.ts hook not found${NC}"
fi

echo ""

# Check 5: Database migration status
echo "5️⃣  Checking database migration status..."
cd apps/api
if npx prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
  echo -e "${GREEN}✅ Database migrations are up to date${NC}"
else
  echo -e "${YELLOW}⚠️  Database migrations may be pending${NC}"
  echo "   Run: cd apps/api && npx prisma migrate deploy"
fi
cd ../..

echo ""

# Final instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Local setup looks good!${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Enable realtime in Supabase Dashboard${NC}"
echo ""
echo "📋 Next steps:"
echo "   1. Go to: https://supabase.com/dashboard"
echo "   2. Select your project"
echo "   3. Navigate to: Database → Replication"
echo "   4. Enable replication for the 'rows' table:"
echo "      ☑️  INSERT"
echo "      ☑️  UPDATE"
echo "      ☑️  DELETE"
echo ""
echo "   OR run this SQL in Supabase SQL Editor:"
echo ""
echo "      ALTER PUBLICATION supabase_realtime ADD TABLE rows;"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🧪 Testing:"
echo "   1. Open: http://localhost:3000/tables/YOUR_TABLE_ID"
echo "   2. Open in another tab (same URL)"
echo "   3. Select cells and trigger enrichment in one tab"
echo "   4. Watch the other tab - should show purple loader immediately!"
echo ""
echo "📖 Full troubleshooting guide: docs/REALTIME_TROUBLESHOOTING.md"
echo ""
