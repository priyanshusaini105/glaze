#!/bin/bash

# Start all services for local development
# 
# Starts:
#   - API server (port 3001)
#   - Worker process
#   - Trigger.dev workflows
# 
# Prerequisites:
#   - Redis running on localhost:6379
#   - PostgreSQL running on localhost:5432
#   - .env.local configured

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Check for required services
check_service() {
  local service=$1
  local host=$2
  local port=$3
  
  if ! nc -z "$host" "$port" 2>/dev/null; then
    echo "❌ $service is not running on $host:$port"
    echo "   Please ensure $service is running before continuing"
    return 1
  fi
}

echo "📋 Checking prerequisites..."
check_service "Redis" "localhost" 6379 || exit 1
check_service "PostgreSQL" "localhost" 5432 || exit 1

echo "✅ All prerequisites met"
echo ""

# Start services in background
echo "🚀 Starting services..."

# API
echo "   Starting API (port 3001)..."
cd "$PROJECT_ROOT/apps/api"
bun run --watch src/index.ts &
API_PID=$!

# Worker
echo "   Starting Worker..."
"$SCRIPT_DIR/run-worker.sh" &
WORKER_PID=$!

# Workflows (optional, requires Trigger.dev account)
if [ "${ENABLE_WORKFLOWS:-false}" = "true" ]; then
  echo "   Starting Workflows..."
  "$SCRIPT_DIR/run-workflows.sh" &
  WORKFLOWS_PID=$!
fi

echo ""
echo "✅ All services started"
echo "   API PID: $API_PID"
echo "   Worker PID: $WORKER_PID"
[ -n "$WORKFLOWS_PID" ] && echo "   Workflows PID: $WORKFLOWS_PID"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""

# Wait and clean up
trap "kill $API_PID $WORKER_PID ${WORKFLOWS_PID:-}" EXIT
wait
