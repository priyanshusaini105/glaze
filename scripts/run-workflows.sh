#!/bin/bash

# Start the Trigger.dev workflows locally
# 
# Usage:
#   ./scripts/run-workflows.sh
#   PORT=3000 ./scripts/run-workflows.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  export $(cat "$PROJECT_ROOT/.env.local" | grep -v '^#' | xargs)
fi

# Set defaults
export PORT="${PORT:-3000}"
export NODE_ENV="${NODE_ENV:-development}"

echo "🚀 Starting Trigger.dev workflows..."
echo "   PORT: $PORT"
echo ""

cd "$PROJECT_ROOT/apps/workflows"
pnpm run dev
