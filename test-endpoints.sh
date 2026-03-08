#!/bin/bash

# Test script for Food Enthusiast Dashboard endpoints
# This script tests all the endpoints used by the dashboard

echo "🧪 Testing Food Enthusiast Dashboard Endpoints"
echo "================================================"
echo ""

# Get the auth token (you'll need to replace this with your actual token)
TOKEN="${1:-YOUR_AUTH_TOKEN_HERE}"
USER_ID="${2:-b3a44d87-bd3d-4184-951a-9613d2233598}"
API_URL="https://itiyum.com/api"

echo "📍 API URL: $API_URL"
echo "👤 User ID: $USER_ID"
echo ""

# Test 1: User Stats
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing: GET /api/users/:userId/stats"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$API_URL/users/$USER_ID/stats" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 2: User Recommendations
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing: GET /api/users/:userId/recommendations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$API_URL/users/$USER_ID/recommendations?limit=6" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 3: User Reviews
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing: GET /api/reviews/user/:userId"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$API_URL/reviews/user/$USER_ID?limit=3" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 4: Trending Restaurants
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Testing: GET /api/recommendations/trending"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$API_URL/recommendations/trending?limit=6" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 5: User Favorites
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Testing: GET /api/users/:userId/favorites"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X GET "$API_URL/users/$USER_ID/favorites?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

echo "✅ All endpoint tests completed!"
echo ""
echo "📝 Usage:"
echo "  ./test-endpoints.sh <AUTH_TOKEN> <USER_ID>"
echo ""
echo "Example:"
echo "  ./test-endpoints.sh eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... b3a44d87-bd3d-4184-951a-9613d2233598"

