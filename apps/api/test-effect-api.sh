#!/bin/bash

# Test the Effect TS Enrichment API

echo "🧪 Testing Effect TS Enrichment API..."
echo ""

API_URL="${1:-http://localhost:3001}"

# Test 1: Health Check
echo "1️⃣ Testing health endpoint..."
curl -s "$API_URL/effect/health" | jq .
echo ""

# Test 2: Single Enrichment
echo "2️⃣ Testing single enrichment..."
curl -s -X POST "$API_URL/effect/enrich" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "userId": "test-user",
    "budgetCents": 100
  }' | jq .
echo ""

# Test 3: Low Budget (should fail to higher providers)
echo "3️⃣ Testing with low budget (15¢)..."
curl -s -X POST "$API_URL/effect/enrich" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://lowbudget.com",
    "userId": "test-user",
    "budgetCents": 15
  }' | jq .
echo ""

# Test 4: Batch Enrichment
echo "4️⃣ Testing batch enrichment..."
curl -s -X POST "$API_URL/effect/demo/batch" \
  -H "Content-Type: application/json" \
  -d '{
    "urls": ["https://a.com", "https://b.com", "https://c.com"],
    "budgetPerUrl": 60
  }' | jq .
echo ""

echo "✅ Tests complete!"
