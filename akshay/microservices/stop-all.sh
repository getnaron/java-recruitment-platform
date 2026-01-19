#!/bin/bash

# Microservices Stop Script
# This script stops all running microservices

echo "🛑 Stopping all microservices..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Navigate to microservices directory
cd "$(dirname "$0")"

# Create .pids directory if it doesn't exist
mkdir -p .pids

# Function to stop a service
stop_service() {
    local pid_file=$1
    local service_name=$2
    
    if [ -f ".pids/$pid_file" ]; then
        PID=$(cat ".pids/$pid_file")
        if ps -p $PID > /dev/null 2>&1; then
            echo "Stopping $service_name (PID: $PID)..."
            kill $PID
            echo -e "${GREEN}✓ $service_name stopped${NC}"
        else
            echo "$service_name is not running"
        fi
        rm ".pids/$pid_file"
    else
        echo "No PID file found for $service_name"
    fi
}

# Stop services in reverse order
stop_service "gateway.pid" "API Gateway"
stop_service "user.pid" "User Service"
stop_service "auth.pid" "Auth Service"
stop_service "eureka.pid" "Eureka Server"

echo ""
echo -e "${GREEN}All services stopped${NC}"
