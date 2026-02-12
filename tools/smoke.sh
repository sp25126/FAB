#!/bin/bash

# FAB Smoke Test Script
# Usage: ./tools/smoke.sh

API_URL="http://localhost:3000"

echo "🚀 Starting FAB Smoke Tests..."
echo "------------------------------"

# 1. Health Check
echo -n "GET /health: "
HEALTH_RES=$(curl -s $API_URL/health)
if [[ $HEALTH_RES == *"\"status\":\"ok\""* ]]; then
    echo "PASS"
else
    echo "FAIL (Result: $HEALTH_RES)"
fi

# 2. Config Brain GET
echo -n "GET /config/brain: "
CONFIG_GET_RES=$(curl -s $API_URL/config/brain)
if [[ $CONFIG_GET_RES == *"\"brainType\":"* ]] && [[ $CONFIG_GET_RES == *"\"remoteUrl\":"* ]]; then
    echo "PASS"
else
    echo "FAIL (Result: $CONFIG_GET_RES)"
fi

# 3. Config Brain POST
echo -n "POST /config/brain: "
CONFIG_POST_RES=$(curl -s -X POST -H "Content-Type: application/json" -d '{"brainType":"local","remoteUrl":""}' $API_URL/config/brain)
if [[ $CONFIG_POST_RES == *"\"success\":true"* ]]; then
    echo "PASS"
else
    echo "FAIL (Result: $CONFIG_POST_RES)"
fi

# 4. Auth Login Redirect Check
echo -n "GET /auth/github/login: "
AUTH_RES=$(curl -s $API_URL/auth/github/login)
# Check if redirect_uri is correct based on FRONTEND_BASE_URL (encoded or raw)
if [[ $AUTH_RES == *"redirect_uri=http"* && $AUTH_RES == *"localhost"* && $AUTH_RES == *"auth%2Fcallback"* ]]; then
    echo "PASS"
else
    echo "FAIL (Result: $AUTH_RES)"
fi

# 5. Unified Profile Check
echo -n "GET /profile/saumya: "
PROFILE_RES=$(curl -s $API_URL/profile/saumya)
if [[ $PROFILE_RES == *"\"growthHistory\":"* && $PROFILE_RES == *"\"projects\":"* ]]; then
    echo "PASS"
else
    echo "FAIL (Result: $PROFILE_RES)"
fi

echo "------------------------------"
echo "✅ Smoke Tests Completed."
