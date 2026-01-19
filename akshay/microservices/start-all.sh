#!/bin/bash

# Microservices Startup Script
# This script starts all microservices in the correct order

echo "🚀 Starting Microservices Architecture..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if a service is running
check_service() {
    local port=$1
    local service_name=$2
    echo -e "${YELLOW}Checking if $service_name is running on port $port...${NC}"
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo -e "${GREEN}✓ $service_name is running${NC}"
        return 0
    else
        echo "✗ $service_name is not running"
        return 1
    fi
}

# Navigate to microservices directory
cd "$(dirname "$0")"

# Source SDKMAN if it exists
export SDKMAN_DIR="/Users/anaron/.sdkman"
[[ -s "$SDKMAN_DIR/bin/sdkman-init.sh" ]] && source "$SDKMAN_DIR/bin/sdkman-init.sh"

echo "Step 1: Starting Eureka Server (Service Discovery)..."
cd eureka-server
mvn spring-boot:run > ../logs/eureka-server.log 2>&1 &
EUREKA_PID=$!
echo "Eureka Server PID: $EUREKA_PID"
cd ..

echo "Waiting for Eureka Server to start (60 seconds)..."
sleep 60

if check_service 8761 "Eureka Server"; then
    echo ""
    echo "Step 2: Starting Auth Service..."
    cd auth-service
    mvn spring-boot:run > ../logs/auth-service.log 2>&1 &
    AUTH_PID=$!
    echo "Auth Service PID: $AUTH_PID"
    cd ..
    
    echo "Waiting for Auth Service to register (40 seconds)..."
    sleep 40
    
    if check_service 8081 "Auth Service"; then
        echo ""
        echo "Step 3: Starting User Service..."
        cd user-service
        mvn spring-boot:run > ../logs/user-service.log 2>&1 &
        USER_PID=$!
        echo "User Service PID: $USER_PID"
        cd ..
        
        echo "Waiting for User Service to register (40 seconds)..."
        sleep 40
        
        if check_service 8082 "User Service"; then
            echo ""
            echo "Step 4: Starting API Gateway..."
            cd api-gateway
            mvn spring-boot:run > ../logs/api-gateway.log 2>&1 &
            GATEWAY_PID=$!
            echo "API Gateway PID: $GATEWAY_PID"
            cd ..
            
            echo "Waiting for API Gateway to start (40 seconds)..."
            sleep 40
            
            if check_service 8080 "API Gateway"; then
                echo ""
                echo -e "${GREEN}========================================${NC}"
                echo -e "${GREEN}✓ All services started successfully!${NC}"
                echo -e "${GREEN}========================================${NC}"
                echo ""
                echo "Service URLs:"
                echo "  • Eureka Dashboard:  http://localhost:8761"
                echo "  • API Gateway (UI):  http://localhost:8080"
                echo "  • Auth Service:      http://localhost:8081"
                echo "  • User Service:      http://localhost:8082"
                echo ""
                echo "Process IDs:"
                echo "  • Eureka Server: $EUREKA_PID"
                echo "  • Auth Service:  $AUTH_PID"
                echo "  • User Service:  $USER_PID"
                echo "  • API Gateway:   $GATEWAY_PID"
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
