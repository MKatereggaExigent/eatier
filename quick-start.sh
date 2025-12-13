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

BACKEND_PORT="3001"
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
node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo -e "${GREEN}✓ Backend started on port $BACKEND_PORT (PID: $BACKEND_PID)${NC}"

# Wait for backend to be ready
echo -e "${YELLOW}⏳ Waiting for backend to be ready...${NC}"
for i in {1..15}; do
    if curl -s http://localhost:$BACKEND_PORT/api/auth/status >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is responding${NC}"
        break
    fi
    sleep 1
    if [ $i -eq 15 ]; then
        echo -e "${YELLOW}⚠️  Backend may not be ready yet, check backend.log if issues occur${NC}"
    fi
done

# Start frontend
echo -e "${YELLOW}🌐 Starting frontend...${NC}"
ng serve --port $FRONTEND_PORT --host 0.0.0.0 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started on port $FRONTEND_PORT (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to be ready
echo -e "${YELLOW}⏳ Waiting for frontend to compile (this may take 30-60 seconds)...${NC}"
for i in {1..120}; do
    if curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    # Show progress every 10 seconds
    if [ $((i % 10)) -eq 0 ]; then
        echo -e "${BLUE}   Still compiling... ($i seconds)${NC}"
    fi
    sleep 1
    if [ $i -eq 120 ]; then
        echo -e "${YELLOW}⚠️  Frontend may not be ready yet, check frontend.log if issues occur${NC}"
    fi
done

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
