#!/usr/bin/env bash
# Supabase Database Setup Script
# This script helps migrate from Neon to Supabase (ap-south-1)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"

echo "🔧 Supabase Database Setup"
echo "=========================="
echo ""

# Check if root .env exists
if [ ! -f "$PROJECT_ROOT/.env" ]; then
    echo "❌ Error: .env file not found in project root"
    echo "   Expected location: $PROJECT_ROOT/.env"
    exit 1
fi

echo "✓ Found root .env file"

# Extract DATABASE_URL and DIRECT_URL from root .env
echo ""
echo "📋 Reading database credentials from root .env..."

# Check if DATABASE_URL exists in root .env
if ! grep -q "^DATABASE_URL=" "$PROJECT_ROOT/.env"; then
    echo "❌ Error: DATABASE_URL not found in root .env"
    echo "   Please add your Supabase connection URLs to $PROJECT_ROOT/.env"
    echo ""
    echo "   Example:"
    echo "   DATABASE_URL=\"postgresql://postgres.PROJECT:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true\""
    echo "   DIRECT_URL=\"postgresql://postgres.PROJECT:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:5432/postgres\""
    exit 1
fi

DATABASE_URL=$(grep "^DATABASE_URL=" "$PROJECT_ROOT/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")
DIRECT_URL=$(grep "^DIRECT_URL=" "$PROJECT_ROOT/.env" | cut -d= -f2- | tr -d '"' | tr -d "'")

if [ -z "$DIRECT_URL" ]; then
    echo "⚠️  Warning: DIRECT_URL not found in root .env"
    echo "   Using DATABASE_URL for both operations"
    DIRECT_URL="$DATABASE_URL"
fi

echo "✓ DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "✓ DIRECT_URL: ${DIRECT_URL:0:50}..."

# Update apps/api/.env
echo ""
echo "📝 Updating apps/api/.env..."

cat > "$API_DIR/.env" <<EOF
# Database Configuration (Supabase ap-south-1)
# Generated: $(date)

# Pooled connection for queries (pgbouncer)
DATABASE_URL="$DATABASE_URL"

# Direct connection for migrations
DIRECT_URL="$DIRECT_URL"

# API Server
PORT=3001
API_URL=http://localhost:3001

# Environment
NODE_ENV=development
EOF

echo "✓ Updated apps/api/.env"

# Test database connection
echo ""
echo "🔍 Testing database connection..."

cd "$API_DIR"

# Test with simple query
if npx prisma db execute --stdin <<< "SELECT 1 as test;" > /dev/null 2>&1; then
    echo "✓ Database connection successful!"
else
    echo "❌ Database connection failed!"
    echo "   Please check your credentials in $PROJECT_ROOT/.env"
    exit 1
fi

# Generate Prisma Client
echo ""
echo "⚙️  Generating Prisma Client..."
npx prisma generate

echo "✓ Prisma Client generated"

# Check migration status
echo ""
echo "📊 Checking migration status..."

MIGRATION_STATUS=$(npx prisma migrate status 2>&1 || true)

if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
    echo "✓ Database schema is up to date"
elif echo "$MIGRATION_STATUS" | grep -q "not yet been applied"; then
    echo ""
    echo "⚠️  Migrations need to be applied"
    echo ""
    read -p "Do you want to apply migrations now? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🚀 Applying migrations..."
        npx prisma migrate deploy
        echo "✓ Migrations applied successfully"
    else
        echo "⏭️  Skipping migrations. Run manually: cd apps/api && npx prisma migrate deploy"
    fi
else
    echo ""
    echo "⚠️  This appears to be a fresh database"
    echo ""
    read -p "Do you want to run migrations to create the schema? (y/N) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "🚀 Running migrations..."
        npx prisma migrate deploy
        echo "✓ Database schema created successfully"
    else
        echo "⏭️  Skipping migrations. Run manually: cd apps/api && npx prisma migrate deploy"
    fi
fi

# Run diagnostic
echo ""
echo "📈 Running performance diagnostic..."
bun run scripts/diagnose-db-performance.ts

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Start the API server: cd apps/api && bun run dev"
echo "  2. Test row creation speed (should be < 100ms now!)"
echo ""
echo "📍 Database Region: ap-south-1 (Mumbai, India)"
echo "   Expected latency: 10-50ms (was 4000+ms with Neon US)"
echo ""
