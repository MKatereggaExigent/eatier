#!/bin/bash

# Itiyum Platform Stop Script
# This script stops Backend and Frontend servers

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo ""
echo "=========================================="
echo "   🛑 STOPPING ITIYUM PLATFORM"
echo "=========================================="
echo ""

# Kill processes by port
print_status "Stopping services..."

# Stop backend (port 3001)
if lsof -ti:3001 > /dev/null 2>&1; then
    print_status "Stopping backend server (port 3001)..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null
    print_success "Backend stopped"
else
    print_status "Backend not running"
fi

# Stop frontend (port 4200)
if lsof -ti:4200 > /dev/null 2>&1; then
    print_status "Stopping frontend server (port 4200)..."
    lsof -ti:4200 | xargs kill -9 2>/dev/null
    print_success "Frontend stopped"
else
    print_status "Frontend not running"
fi

# Kill by PID if .itiyum_pids exists
if [ -f ".itiyum_pids" ]; then
    print_status "Stopping services using saved PIDs..."
    source .itiyum_pids
    
    if [ ! -z "$BACKEND_PID" ]; then
        kill -9 $BACKEND_PID 2>/dev/null && print_success "Killed backend PID: $BACKEND_PID" || true
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill -9 $FRONTEND_PID 2>/dev/null && print_success "Killed frontend PID: $FRONTEND_PID" || true
    fi
    
    rm .itiyum_pids
    print_success "Removed .itiyum_pids file"
fi

# Kill any remaining node processes related to the project
print_status "Cleaning up any remaining processes..."
pkill -f "node server.js" 2>/dev/null || true
pkill -f "ng serve" 2>/dev/null || true

echo ""
print_success "All services stopped! ✅"
echo ""

