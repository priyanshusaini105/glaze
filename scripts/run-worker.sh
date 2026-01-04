#!/bin/bash

# Start the enrichment worker locally
# 
# Usage:
#   ./scripts/run-worker.sh
#   REDIS_URL=redis://localhost:6379 ./scripts/run-worker.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  export $(cat "$PROJECT_ROOT/.env.local" | grep -v '^#' | xargs)
fi

# Set defaults
export REDIS_URL="${REDIS_URL:-redis://localhost:6379}"
export QUEUE_NAME="${QUEUE_NAME:-enrichment}"
export NODE_ENV="${NODE_ENV:-development}"

echo "🚀 Starting enrichment worker..."
echo "   REDIS_URL: $REDIS_URL"
echo "   QUEUE_NAME: $QUEUE_NAME"
echo ""

cd "$PROJECT_ROOT/apps/worker"
bun run --watch src/index.ts
