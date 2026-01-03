3#!/bin/bash

# LinkedIn API Setup Script
# Run this to quickly test your LinkedIn API integration

echo "🚀 LinkedIn API Integration Test"
echo "================================="
echo ""

# Check if RAPIDAPI_KEY is set
if [ -z "$RAPIDAPI_KEY" ]; then
  echo "⚠️  Warning: RAPIDAPI_KEY not set in environment"
  echo ""
  echo "To set it up:"
  echo "1. Get your API key from https://rapidapi.com/developer/dashboard"
  echo "2. Add to .env file:"
  echo "   echo 'RAPIDAPI_KEY=your_key_here' >> apps/api/.env"
  echo ""
  echo "3. Re-run this script"
  exit 1
fi

echo "✅ RAPIDAPI_KEY found"
echo ""

# Check if we're in the right directory
if [ ! -f "src/index.ts" ]; then
  echo "⚠️  Please run this script from apps/api directory"
  echo "   cd apps/api && ./test-linkedin.sh"
  exit 1
fi

echo "📝 Testing LinkedIn API endpoints..."
echo ""

# Start the server in the background
echo "🔄 Starting API server..."
bun run dev &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo ""
echo "🧪 Running tests..."
echo ""

# Test 1: Health check
echo "1️⃣ Testing health endpoint..."
curl -s http://localhost:3001/health | jq '.'
echo ""

# Test 2: LinkedIn profile (using a sample URL)
echo "2️⃣ Testing LinkedIn profile endpoint..."
echo "   URL: https://www.linkedin.com/in/williamhgates"
curl -s "http://localhost:3001/linkedin/profile?url=https://www.linkedin.com/in/williamhgates" | jq '.success, .data.full_name, .data.headline'
echo ""

# Test 3: LinkedIn company
echo "3️⃣ Testing LinkedIn company endpoint..."
echo "   URL: https://www.linkedin.com/company/microsoft"
curl -s "http://localhost:3001/linkedin/company?url=https://www.linkedin.com/company/microsoft" | jq '.success, .data.company_name, .data.industry'
echo ""

# Test 4: Search people
echo "4️⃣ Testing people search..."
echo "   Keywords: Software Engineer, Location: San Francisco"
curl -s "http://localhost:3001/linkedin/search/people?keywords=Software+Engineer&location=San+Francisco&limit=3" | jq '.success, .count'
echo ""

echo "✅ Tests complete!"
echo ""
echo "📚 Next steps:"
echo "   - View full API docs: http://localhost:3001/docs"
echo "   - Read integration guide: cat LINKEDIN_README.md"
echo "   - Run examples: bun run src/examples/linkedin-api-examples.ts"
echo ""

# Stop the server
kill $SERVER_PID 2>/dev/null

echo "🎉 Setup verification complete!"
