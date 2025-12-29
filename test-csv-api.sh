#!/bin/bash

# Test CSV Import/Export Functionality

echo "Testing CSV Import/Export API..."

# Read the sample CSV file
CSV_CONTENT=$(cat sample-data.csv)

# Escape the CSV content for JSON
CSV_JSON=$(echo "$CSV_CONTENT" | jq -Rs .)

# Test CSV Import
echo -e "\n1. Testing CSV Import..."
RESPONSE=$(curl -s -X POST http://localhost:3001/tables/import-csv \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Company Database\",
    \"description\": \"Imported from CSV for testing\",
    \"csvContent\": $CSV_JSON
  }")

# Extract table ID from response
TABLE_ID=$(echo "$RESPONSE" | jq -r '.id')

if [ "$TABLE_ID" != "null" ] && [ -n "$TABLE_ID" ]; then
  echo "✓ CSV Import successful! Table ID: $TABLE_ID"
  
  # Test CSV Export
  echo -e "\n2. Testing CSV Export..."
  curl -s "http://localhost:3001/tables/$TABLE_ID/export-csv" -o "exported-table.csv"
  
  if [ -f "exported-table.csv" ]; then
    echo "✓ CSV Export successful!"
    echo -e "\nExported content:"
    cat exported-table.csv
  else
    echo "✗ CSV Export failed"
  fi
  
  # Display table info
  echo -e "\n3. Table Details:"
  curl -s "http://localhost:3001/tables/$TABLE_ID" | jq '.'
  
else
  echo "✗ CSV Import failed"
  echo "Response: $RESPONSE"
fi
