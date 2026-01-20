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

echo "Step 1: Starting Eureka Server (Service Discovery)..."
cd eureka-server
mvn spring-boot:run > ../logs/eureka-server.log 2>&1 &
EUREKA_PID=$!
echo "Eureka Server PID: $EUREKA_PID"
cd ..

if wait_for_port 8761 "Eureka Server" 60; then
    echo ""
    echo "Step 2: Starting Auth Service..."
    cd auth-service
    mvn spring-boot:run > ../logs/auth-service.log 2>&1 &
    AUTH_PID=$!
    echo "Auth Service PID: $AUTH_PID"
    cd ..
    
    if wait_for_port 8081 "Auth Service" 60; then
        echo ""
        echo "Step 3: Starting User Service..."
        cd user-service
        mvn spring-boot:run > ../logs/user-service.log 2>&1 &
        USER_PID=$!
        echo "User Service PID: $USER_PID"
        cd ..
        
        if wait_for_port 8082 "User Service" 60; then
            echo ""
            echo "Step 4: Starting API Gateway..."
            cd api-gateway
            mvn spring-boot:run > ../logs/api-gateway.log 2>&1 &
            GATEWAY_PID=$!
            echo "API Gateway PID: $GATEWAY_PID"
            cd ..
            
            if wait_for_port 8080 "API Gateway" 60; then
                echo ""
                echo "Step 5: Starting UI Portal..."
                cd ui-portal
                python3 -m http.server 3000 > ../logs/ui-portal.log 2>&1 &
                UI_PID=$!
                echo "UI Portal PID: $UI_PID"
                cd ..
                
                if wait_for_port 3000 "UI Portal" 20; then
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
                    echo ""
                    echo "Process IDs:"
                    echo "  • Eureka Server: $EUREKA_PID"
                    echo "  • Auth Service:  $AUTH_PID"
                    echo "  • User Service:  $USER_PID"
                    echo "  • API Gateway:   $GATEWAY_PID"
                    echo "  • UI Portal:     $UI_PID"
                    echo ""
                    echo "Logs are available in the 'logs' directory"
                    echo ""
                    echo "To stop all services, run: ./stop-all.sh"
                    echo ""
                    
                    # Save PIDs to file for stop script
                    echo "$EUREKA_PID" > .pids/eureka.pid
                    echo "$AUTH_PID" > .pids/auth.pid
                    echo "$USER_PID" > .pids/user.pid
                    echo "$GATEWAY_PID" > .pids/gateway.pid
                    echo "$UI_PID" > .pids/ui.pid
                else
                    echo "Failed to start UI Portal"
                    exit 1
                fi
            else
                echo "Failed to start API Gateway"
                exit 1
            fi
        else
            echo "Failed to start User Service"
            exit 1
        fi
    else
        echo "Failed to start Auth Service"
        exit 1
    fi
else
    echo "Failed to start Eureka Server"
    exit 1
fi
