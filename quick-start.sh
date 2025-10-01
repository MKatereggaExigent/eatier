#!/bin/bash

# ===================================
# ITIYUM PLATFORM QUICK START
# For when everything is already set up
# ===================================

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BACKEND_PORT="3000"
FRONTEND_PORT="4200"

echo -e "${CYAN}🍽️  ITIYUM PLATFORM - QUICK START${NC}"
echo -e "${BLUE}=================================${NC}"

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing existing process on port $port${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Kill any existing processes
if port_in_use $BACKEND_PORT; then
    kill_port $BACKEND_PORT
fi

if port_in_use $FRONTEND_PORT; then
    kill_port $FRONTEND_PORT
fi

# Start backend
echo -e "${YELLOW}🚀 Starting backend...${NC}"
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}✓ Backend started on port $BACKEND_PORT${NC}"

# Start frontend
echo -e "${YELLOW}🌐 Starting frontend...${NC}"
ng serve --port $FRONTEND_PORT --host 0.0.0.0 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started on port $FRONTEND_PORT${NC}"

# Wait a moment then open browser
sleep 5

if command -v open >/dev/null 2>&1; then
    open http://localhost:$FRONTEND_PORT
elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open http://localhost:$FRONTEND_PORT
else
    echo -e "${YELLOW}Open http://localhost:$FRONTEND_PORT in your browser${NC}"
fi

echo -e "${GREEN}"
echo "🎉 ITIYUM IS RUNNING!"
echo "🌐 Frontend: http://localhost:$FRONTEND_PORT"
echo "🚀 Backend:  http://localhost:$BACKEND_PORT"
echo "🛑 Press Ctrl+C to stop"
echo -e "${NC}"

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT
    echo -e "${GREEN}✓ Services stopped${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Keep running
while true; do
    sleep 1
done
