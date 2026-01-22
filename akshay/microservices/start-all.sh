#!/bin/bash

# Microservices Startup Script
# This script starts all microservices in the correct order

echo "🚀 Starting Microservices Architecture..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to wait for a service to be ready
wait_for_port() {
    local port=$1
    local service_name=$2
    local timeout=$3
    local elapsed=0
    
    echo -e "${YELLOW}Waiting for $service_name to start on port $port (timeout: ${timeout}s)...${NC}"
    while ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; do
        sleep 2
        elapsed=$((elapsed + 2))
        if [ $elapsed -ge $timeout ]; then
            echo -e "${RED}✗ $service_name failed to start within ${timeout}s${NC}"
            return 1
        fi
        echo -n "."
    done
    echo ""
    echo -e "${GREEN}✓ $service_name is up!${NC}"
    return 0
}

# Navigate to microservices directory
cd "$(dirname "$0")"

# Source SDKMAN if it exists
export SDKMAN_DIR="/Users/anaron/.sdkman"
[[ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ]] && source "$SDKMAN_DIR/bin/sdkman-init.sh"

# Ensure logs directory exists
mkdir -p logs
mkdir -p .pids

# Start MongoDB
echo "Step 0: Starting MongoDB..."
mongod --dbpath mongodb_data --logpath logs/mongodb.log --nounixsocket > /dev/null 2>&1 &
MONGO_PID=$!
echo "$MONGO_PID" > .pids/mongodb.pid
if ! wait_for_port 27017 "MongoDB" 30; then exit 1; fi

# Start Eureka
echo "Step 1: Starting Eureka Server..."
cd eureka-server
mvn spring-boot:run > ../logs/eureka-server.log 2>&1 &
EUREKA_PID=$!
cd ..
if ! wait_for_port 8761 "Eureka Server" 60; then exit 1; fi

# Start Auth
echo "Step 2: Starting Auth Service..."
cd auth-service
mvn spring-boot:run > ../logs/auth-service.log 2>&1 &
AUTH_PID=$!
cd ..
if ! wait_for_port 8081 "Auth Service" 60; then exit 1; fi

# Start User
echo "Step 3: Starting User Service..."
cd user-service
mvn spring-boot:run > ../logs/user-service.log 2>&1 &
USER_PID=$!
cd ..
if ! wait_for_port 8082 "User Service" 60; then exit 1; fi

# Start Job
echo "Step 4: Starting Job Service..."
cd job-service
mvn spring-boot:run > ../logs/job-service.log 2>&1 &
JOB_PID=$!
cd ..
if ! wait_for_port 8083 "Job Service" 60; then exit 1; fi

# Start Gateway
echo "Step 5: Starting API Gateway..."
cd api-gateway
mvn spring-boot:run > ../logs/api-gateway.log 2>&1 &
GATEWAY_PID=$!
cd ..
if ! wait_for_port 8080 "API Gateway" 60; then exit 1; fi

# Start UI
echo "Step 6: Starting UI Portal..."
cd ui-portal
python3 -m http.server 3000 > ../logs/ui-portal.log 2>&1 &
UI_PID=$!
cd ..
if ! wait_for_port 3000 "UI Portal" 20; then exit 1; fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ All services started successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Service URLs:"
echo "  • Eureka Dashboard:  http://localhost:8761"
echo "  • API Gateway:       http://localhost:8080"
echo "  • UI Portal:         http://localhost:3000"
echo "  • Auth Service:      http://localhost:8081"
echo "  • User Service:      http://localhost:8082"
echo "  • Job Service:       http://localhost:8083"
echo ""

# Save PIDs
echo "$EUREKA_PID" > .pids/eureka.pid
echo "$AUTH_PID" > .pids/auth.pid
echo "$USER_PID" > .pids/user.pid
echo "$JOB_PID" > .pids/job.pid
echo "$GATEWAY_PID" > .pids/gateway.pid
echo "$UI_PID" > .pids/ui.pid

echo "To stop all services, run: ./stop-all.sh"
