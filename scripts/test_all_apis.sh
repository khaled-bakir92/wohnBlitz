#!/bin/bash

# Wohnblitzer API Test Script
# This script tests all available API endpoints using curl

BASE_URL="http://localhost:8000"
TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Wohnblitzer API Testing Suite ===${NC}"
echo -e "${YELLOW}Base URL: ${BASE_URL}${NC}"
echo

# Function to test endpoint
test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local data="$4"
    local headers="$5"
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo -e "  ${method} ${endpoint}"
    
    if [ -n "$data" ]; then
        if [ -n "$headers" ]; then
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" -H "Content-Type: application/json" -H "$headers" -d "$data")
        else
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" -H "Content-Type: application/json" -d "$data")
        fi
    else
        if [ -n "$headers" ]; then
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "${BASE_URL}${endpoint}" -H "$headers")
        else
            response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X "$method" "${BASE_URL}${endpoint}")
        fi
    fi
    
    http_code=$(echo $response | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')
    body=$(echo $response | sed -e 's/HTTP_STATUS:.*//g')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "  ${GREEN}✓ Status: $http_code${NC}"
    elif [ "$http_code" -ge 400 ] && [ "$http_code" -lt 500 ]; then
        echo -e "  ${YELLOW}⚠ Status: $http_code (Client Error)${NC}"
    else
        echo -e "  ${RED}✗ Status: $http_code${NC}"
    fi
    
    echo -e "  Response: $body"
    echo
}

# Wait for server to start
echo -e "${YELLOW}Waiting for server to start...${NC}"
sleep 3

# 1. Basic Health Checks
echo -e "${YELLOW}=== 1. BASIC HEALTH CHECKS ===${NC}"
test_endpoint "GET" "/" "Root endpoint - API info"
test_endpoint "GET" "/health" "Health check endpoint"

# 2. Authentication Tests
echo -e "${YELLOW}=== 2. AUTHENTICATION TESTS ===${NC}"

# First, try to register a test user
test_endpoint "POST" "/api/register" "Register new user" '{
    "vorname": "Test",
    "nachname": "User",
    "email": "test@example.com",
    "password": "testpassword123",
    "filter_einstellungen": "{}",
    "bewerbungsprofil": "{}"
}'

# Login with the new user
echo -e "${YELLOW}Logging in to get token...${NC}"
login_response=$(curl -s -w "HTTP_STATUS:%{http_code}" -X POST "${BASE_URL}/api/login" -H "Content-Type: application/json" -d '{
    "email": "test@example.com",
    "password": "testpassword123"
}')

login_http_code=$(echo $login_response | tr -d '\n' | sed -e 's/.*HTTP_STATUS://')
login_body=$(echo $login_response | sed -e 's/HTTP_STATUS:.*//g')

if [ "$login_http_code" -eq 200 ]; then
    TOKEN=$(echo $login_body | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")
    echo -e "${GREEN}✓ Login successful, token obtained${NC}"
else
    echo -e "${RED}✗ Login failed: $login_http_code${NC}"
    echo -e "  Response: $login_body"
fi

# Test token endpoint (OAuth2 password flow)
test_endpoint "POST" "/api/token" "Token endpoint (OAuth2)" "username=test@example.com&password=testpassword123" "Content-Type: application/x-www-form-urlencoded"

# 3. Protected Endpoint Tests (with authentication)
echo -e "${YELLOW}=== 3. PROTECTED ENDPOINT TESTS ===${NC}"

if [ -n "$TOKEN" ]; then
    AUTH_HEADER="Authorization: Bearer $TOKEN"
    echo -e "${GREEN}Using token: ${TOKEN:0:20}...${NC}"
    
    # Bot Management
    test_endpoint "GET" "/api/bot/status" "Get bot status" "" "$AUTH_HEADER"
    test_endpoint "POST" "/api/bot/start" "Start bot" "" "$AUTH_HEADER"
    test_endpoint "POST" "/api/bot/stop" "Stop bot" "" "$AUTH_HEADER"
    
    # Applications
    test_endpoint "GET" "/api/bewerbungen/" "Get applications" "" "$AUTH_HEADER"
    test_endpoint "GET" "/api/bewerbungen/?limit=10&skip=0" "Get applications with pagination" "" "$AUTH_HEADER"
    
    # Statistics
    test_endpoint "GET" "/api/statistik/" "Get user statistics" "" "$AUTH_HEADER"
    
    # Messages
    test_endpoint "GET" "/nachrichten/" "Get messages" "" "$AUTH_HEADER"
    
    # Filter Settings
    test_endpoint "GET" "/api/filter/" "Get filter settings" "" "$AUTH_HEADER"
    test_endpoint "POST" "/api/filter/" "Update filter settings" '{
        "filter_einstellungen": "{\"max_price\": 1000, \"min_rooms\": 2}"
    }' "$AUTH_HEADER"
    
    # Support
    test_endpoint "GET" "/api/support/" "Get support messages" "" "$AUTH_HEADER"
    test_endpoint "POST" "/api/support/" "Send support message" '{
        "text": "This is a test support message",
        "betreff": "Test Support"
    }' "$AUTH_HEADER"
    
    # Create a sample application
    test_endpoint "POST" "/api/bewerbungen/" "Create application" '{
        "wohnung_url": "https://example.com/apartment/123",
        "wohnung_titel": "Test Apartment",
        "miete": 800.0,
        "groesse": 75.0,
        "zimmer": 3,
        "bewerbungstext": "Test application text"
    }' "$AUTH_HEADER"
    
else
    echo -e "${RED}No token available, skipping protected endpoint tests${NC}"
fi

# 4. Monitoring Tests
echo -e "${YELLOW}=== 4. MONITORING TESTS ===${NC}"
test_endpoint "GET" "/api/monitoring/health" "Monitoring health check"

# 5. Admin Tests (these will likely fail without admin token)
echo -e "${YELLOW}=== 5. ADMIN TESTS (may fail without admin privileges) ===${NC}"
test_endpoint "GET" "/api/users/" "Get all users (admin)" "" "$AUTH_HEADER"
test_endpoint "GET" "/api/bot/admin/status" "Get all bot statuses (admin)" "" "$AUTH_HEADER"
test_endpoint "GET" "/api/monitoring/metrics" "Get system metrics (admin)" "" "$AUTH_HEADER"
test_endpoint "GET" "/api/monitoring/statistics" "Get detailed statistics (admin)" "" "$AUTH_HEADER"
test_endpoint "GET" "/api/monitoring/alerts" "Get system alerts (admin)" "" "$AUTH_HEADER"
test_endpoint "GET" "/api/support/admin/all" "Get all support messages (admin)" "" "$AUTH_HEADER"

# 6. Error Cases
echo -e "${YELLOW}=== 6. ERROR CASE TESTS ===${NC}"
test_endpoint "GET" "/api/bot/status" "Bot status without auth (should fail)"
test_endpoint "GET" "/api/bewerbungen/" "Applications without auth (should fail)"
test_endpoint "GET" "/nonexistent" "Non-existent endpoint (should 404)"

# 7. OpenAPI Documentation
echo -e "${YELLOW}=== 7. OPENAPI DOCUMENTATION ===${NC}"
test_endpoint "GET" "/docs" "Swagger UI documentation"
test_endpoint "GET" "/redoc" "ReDoc documentation"
test_endpoint "GET" "/openapi.json" "OpenAPI schema"

echo -e "${GREEN}=== API Testing Complete ===${NC}"
echo -e "${YELLOW}Note: Some endpoints may require specific data or admin privileges${NC}"
echo -e "${YELLOW}Check the FastAPI docs at http://localhost:8000/docs for interactive testing${NC}" 