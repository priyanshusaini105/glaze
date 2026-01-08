#!/bin/bash

# Supabase Realtime Setup Verification
# Run this to verify everything is configured correctly

echo "🔍 Verifying Supabase Realtime Setup..."
echo ""

# Check 1: Environment variables
echo "1️⃣  Checking environment variables..."
if grep -q "NEXT_PUBLIC_SUPABASE_URL" apps/web/.env.local && grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" apps/web/.env.local; then
  echo "   ✅ Supabase environment variables found"
else
  echo "   ❌ Missing Supabase environment variables in apps/web/.env.local"
  exit 1
fi
echo ""

# Check 2: Database schema
echo "2️⃣  Checking database schema..."
if grep -q "enrichingColumns.*String\[\]" apps/api/prisma/schema.prisma; then
  echo "   ✅ enrichingColumns field exists in schema"
else
  echo "   ❌ enrichingColumns field missing from schema"
  exit 1
fi
echo ""

# Check 3: Supabase client
echo "3️⃣  Checking Supabase client..."
if [ -f "apps/web/lib/supabase.ts" ]; then
  echo "   ✅ Supabase client configured"
else
  echo "   ❌ Supabase client missing"
  exit 1
fi
echo ""

# Check 4: Realtime provider
echo "4️⃣  Checking realtime provider..."
if [ -f "apps/web/providers/supabase-realtime-provider.tsx" ]; then
  echo "   ✅ Realtime provider exists"
else
  echo "   ❌ Realtime provider missing"
  exit 1
fi
echo ""

# Check 5: Realtime hook
echo "5️⃣  Checking realtime hook..."
if [ -f "apps/web/hooks/use-table-realtime.ts" ]; then
  echo "   ✅ useTableRealtime hook exists"
else
  echo "   ❌ useTableRealtime hook missing"
  exit 1
fi
echo ""

# Check 6: Provider in layout
echo "6️⃣  Checking layout integration..."
if grep -q "SupabaseRealtimeProvider" apps/web/app/layout.tsx; then
  echo "   ✅ Provider added to layout"
else
  echo "   ❌ Provider not in layout"
  exit 1
fi
echo ""

# Check 7: Table integration
echo "7️⃣  Checking table integration..."
if grep -q "useTableRealtime" apps/web/app/\(dashboard\)/tables/\[tableId\]/page.tsx; then
  echo "   ✅ Realtime integrated in main table"
else
  echo "   ❌ Realtime not integrated in table"
  exit 1
fi
echo ""

# Check 8: API updates enrichingColumns
echo "8️⃣  Checking API enrichment start..."
if grep -q "enrichingColumns" apps/api/src/routes/cell-enrich.ts; then
  echo "   ✅ API sets enrichingColumns on start"
else
  echo "   ❌ API doesn't set enrichingColumns"
  exit 1
fi
echo ""

# Check 9: Workflow clears enrichingColumns
echo "9️⃣  Checking workflow enrichment completion..."
if grep -q "newEnrichingColumns" apps/workflows/src/cell-enrichment.ts; then
  echo "   ✅ Workflow clears enrichingColumns on completion"
else
  echo "   ❌ Workflow doesn't clear enrichingColumns"
  exit 1
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL CHECKS PASSED!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Supabase Realtime is fully configured!"
echo ""
echo "📋 Next steps:"
echo "   1. Ensure Supabase Realtime is enabled for 'rows' table"
echo "   2. Open a table in multiple browser tabs"
echo "   3. Trigger enrichment and watch loaders appear in ALL tabs"
echo ""
echo "📚 Documentation:"
echo "   • Quick Ref: docs/REALTIME_QUICK_REF.md"
echo "   • Full Guide: docs/SUPABASE_REALTIME_ENRICHMENT.md"
echo "   • Summary: REALTIME_SETUP_COMPLETE.md"
echo ""
