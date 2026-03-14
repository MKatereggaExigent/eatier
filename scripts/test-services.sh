#!/bin/bash

# Comprehensive Testing Script for Itiyum Platform Services
# This script tests all the updated services to ensure they work with the backend API

echo "🧪 ITIYUM PLATFORM SERVICE TESTING SCRIPT"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to print test results
print_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        if [ -n "$details" ]; then
            echo -e "   ${YELLOW}Details:${NC} $details"
        fi
        ((TESTS_FAILED++))
    fi
}

# Function to test API endpoint
test_api_endpoint() {
    local method="$1"
    local endpoint="$2"
    local expected_status="$3"
    local test_name="$4"
    local data="$5"
    
    echo -e "${BLUE}Testing:${NC} $test_name"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json "http://localhost:3000/api/$endpoint")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X POST -H "Content-Type: application/json" -d "$data" "http://localhost:3000/api/$endpoint")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X PUT -H "Content-Type: application/json" -d "$data" "http://localhost:3000/api/$endpoint")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "%{http_code}" -o /tmp/response.json -X DELETE "http://localhost:3000/api/$endpoint")
    fi
    
    http_code="${response: -3}"
    
    if [ "$http_code" = "$expected_status" ]; then
        print_test_result "$test_name" "PASS"
    else
        print_test_result "$test_name" "FAIL" "Expected $expected_status, got $http_code"
    fi
}

echo "🔧 PRELIMINARY CHECKS"
echo "--------------------"

# Check if backend is running
echo -e "${BLUE}Checking:${NC} Backend server status"
if curl -s http://localhost:3000/api/health > /dev/null; then
    print_test_result "Backend server running" "PASS"
else
    print_test_result "Backend server running" "FAIL" "Backend not accessible at http://localhost:3000"
    echo -e "${RED}❌ Cannot proceed with tests. Please start the backend server first.${NC}"
    exit 1
fi

# Check if frontend is running
echo -e "${BLUE}Checking:${NC} Frontend server status"
if curl -s http://localhost:4200 > /dev/null; then
    print_test_result "Frontend server running" "PASS"
else
    print_test_result "Frontend server running" "FAIL" "Frontend not accessible at http://localhost:4200"
fi

echo ""
echo "🎯 AD MANAGEMENT SERVICE TESTS"
echo "------------------------------"

# Test ad campaigns endpoints
test_api_endpoint "GET" "ads/campaigns/temp-user" "200" "Get user campaigns"
test_api_endpoint "POST" "ads/campaigns" "201" "Create new campaign" '{
    "userId": "temp-user",
    "title": "Test Campaign",
    "description": "Test campaign description",
    "type": "promoted",
    "totalBudget": 100,
    "dailyBudget": 10,
    "targeting": {
        "geographic": {"regions": ["East Africa"]},
        "demographic": {"ageRange": {"min": 25, "max": 45}}
    },
    "content": {
        "text": {"headline": "Test Ad", "description": "Test description"}
    }
}'

# Test payment methods
test_api_endpoint "GET" "ads/payment-methods/temp-user" "200" "Get payment methods"
test_api_endpoint "POST" "ads/payment-methods" "201" "Add payment method" '{
    "userId": "temp-user",
    "type": "credit_card",
    "cardNumber": "4532",
    "expiryDate": "12/26",
    "cardholderName": "Test User"
}'

echo ""
echo "📅 BOOKING SERVICE TESTS"
echo "------------------------"

# Test booking endpoints
test_api_endpoint "GET" "bookings/user/temp-user" "200" "Get user bookings"
test_api_endpoint "POST" "bookings" "201" "Create new booking" '{
    "businessId": "business-1",
    "userId": "temp-user",
    "bookingDate": "2024-12-25",
    "bookingTime": "19:00",
    "partySize": 4,
    "contactName": "Test User",
    "contactPhone": "+1234567890",
    "contactEmail": "test@example.com"
}'

# Test availability
test_api_endpoint "GET" "bookings/availability/temp-user" "200" "Get booking availability"

echo ""
echo "❤️ FAVORITES SERVICE TESTS"
echo "--------------------------"

# Test favorites endpoints
test_api_endpoint "GET" "favorites/temp-user" "200" "Get user favorites"
test_api_endpoint "POST" "favorites" "201" "Add to favorites" '{
    "userId": "temp-user",
    "businessId": "business-1",
    "notes": "Great restaurant!"
}'

# Test collections
test_api_endpoint "GET" "favorites/collections/temp-user" "200" "Get user collections"

echo ""
echo "⭐ REVIEWS SERVICE TESTS"
echo "-----------------------"

# Test reviews endpoints
test_api_endpoint "GET" "reviews/user/temp-user" "200" "Get user reviews"
test_api_endpoint "POST" "reviews" "201" "Create new review" '{
    "businessId": "business-1",
    "userId": "temp-user",
    "overallRating": 5,
    "title": "Excellent Experience",
    "content": "Amazing food and service!",
    "wouldRecommend": true
}'

echo ""
echo "💬 CONTACT INQUIRIES TESTS"
echo "--------------------------"

# Test inquiries endpoints
test_api_endpoint "GET" "inquiries/temp-user" "200" "Get user inquiries"
test_api_endpoint "POST" "inquiries" "201" "Submit inquiry" '{
    "recipientId": "business-1",
    "inquirerName": "Test User",
    "inquirerEmail": "test@example.com",
    "subject": "Test Inquiry",
    "message": "This is a test inquiry",
    "inquiryType": "general"
}'

echo ""
echo "🏢 BUSINESS DATA TESTS"
echo "---------------------"

# Test business endpoints
test_api_endpoint "GET" "businesses" "200" "Get all businesses"

echo ""
echo "📊 TEST SUMMARY"
echo "==============="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL TESTS PASSED! The services are properly wired to the backend.${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please check the backend implementation.${NC}"
    exit 1
fi
