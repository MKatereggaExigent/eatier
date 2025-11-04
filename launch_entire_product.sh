#!/bin/bash

# Itiyum Platform Launch Script
# This script starts PostgreSQL, Backend, and Frontend servers

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if a port is in use
check_port() {
    lsof -i :$1 > /dev/null 2>&1
    return $?
}

# Function to kill process on a port
kill_port() {
    print_status "Killing process on port $1..."
    lsof -ti:$1 | xargs kill -9 2>/dev/null || true
    sleep 1
}

echo ""
echo "=========================================="
echo "   🚀 ITIYUM PLATFORM LAUNCHER 🚀"
echo "=========================================="
echo ""

# Step 1: Check and start PostgreSQL
print_status "Checking PostgreSQL status..."
if pg_isready -q 2>/dev/null; then
    print_success "PostgreSQL is already running"
else
    print_warning "PostgreSQL is not running. Starting..."
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
    
    # Wait for PostgreSQL to start
    print_status "Waiting for PostgreSQL to start..."
    for i in {1..10}; do
        if pg_isready -q 2>/dev/null; then
            print_success "PostgreSQL started successfully"
            break
        fi
        sleep 1
        if [ $i -eq 10 ]; then
            print_error "PostgreSQL failed to start"
            exit 1
        fi
    done
fi

# Step 2: Verify database exists
print_status "Checking database..."
if psql -U michaelkateregga -d itiyum_platform -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database 'itiyum_platform' is accessible"
else
    print_error "Database 'itiyum_platform' is not accessible"
    print_warning "Please create the database first or restore from backup"
    exit 1
fi

# Step 3: Check Node.js version
print_status "Checking Node.js version..."
if command -v nvm &> /dev/null; then
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Use Node.js 20.19.5
    print_status "Switching to Node.js 20.19.5..."
    nvm use 20.19.5 > /dev/null 2>&1 || {
        print_error "Node.js 20.19.5 not found. Please install it with: nvm install 20.19.5"
        exit 1
    }
    print_success "Using Node.js $(node --version)"
else
    print_warning "nvm not found. Using system Node.js $(node --version)"
fi

# Step 4: Kill existing processes on ports 3001 and 4200
print_status "Checking for existing processes..."
if check_port 3001; then
    print_warning "Port 3001 is in use"
    kill_port 3001
    print_success "Cleared port 3001"
fi

if check_port 4200; then
    print_warning "Port 4200 is in use"
    kill_port 4200
    print_success "Cleared port 4200"
fi

# Step 5: Start Backend Server
print_status "Starting Backend Server..."
cd backend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Backend dependencies not installed. Installing..."
    npm install
fi

# Start backend in background
nohup node server.js > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
print_status "Waiting for backend to start..."
for i in {1..15}; do
    if curl -s http://localhost:3001/api/auth/status > /dev/null 2>&1; then
        print_success "Backend server started successfully (PID: $BACKEND_PID)"
        print_success "Backend running at: http://localhost:3001"
        break
    fi
    sleep 1
    if [ $i -eq 15 ]; then
        print_error "Backend failed to start. Check backend.log for details"
        tail -20 backend.log
        exit 1
    fi
done

# Step 6: Start Frontend Server
print_status "Starting Frontend Server..."

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "Frontend dependencies not installed. Installing..."
    npm install
fi

# Start frontend in background
nohup npm start > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
print_status "Waiting for frontend to build and start..."
print_warning "This may take 30-60 seconds for the first build..."

for i in {1..120}; do
    if curl -s http://localhost:4200 > /dev/null 2>&1; then
        print_success "Frontend server started successfully (PID: $FRONTEND_PID)"
        print_success "Frontend running at: http://localhost:4200"
        break
    fi
    
    # Show progress every 10 seconds
    if [ $((i % 10)) -eq 0 ]; then
        print_status "Still building... ($i seconds elapsed)"
    fi
    
    sleep 1
    
    if [ $i -eq 120 ]; then
        print_error "Frontend failed to start. Check frontend.log for details"
        tail -30 frontend.log
        exit 1
    fi
done

# Step 7: Summary
echo ""
echo "=========================================="
echo "   ✅ ALL SERVICES STARTED SUCCESSFULLY"
echo "=========================================="
echo ""
echo "📊 Service Status:"
echo "  • PostgreSQL:  ✅ Running"
echo "  • Backend:     ✅ Running (PID: $BACKEND_PID)"
echo "  • Frontend:    ✅ Running (PID: $FRONTEND_PID)"
echo ""
echo "🌐 Access URLs:"
echo "  • Frontend:    http://localhost:4200"
echo "  • Backend API: http://localhost:3001/api"
echo "  • Login Page:  http://localhost:4200/login"
echo ""
echo "📝 Logs:"
echo "  • Backend:     tail -f backend.log"
echo "  • Frontend:    tail -f frontend.log"
echo ""
echo "🛑 To stop all services:"
echo "  • Kill backend:  kill $BACKEND_PID"
echo "  • Kill frontend: kill $FRONTEND_PID"
echo "  • Or use:        ./stop_entire_product.sh"
echo ""
echo "🔐 Admin Login:"
echo "  • Email:    admin@itiyum.com"
echo "  • Password: Admin@123"
echo ""
echo "=========================================="
echo ""

# Save PIDs to file for easy stopping
echo "BACKEND_PID=$BACKEND_PID" > .itiyum_pids
echo "FRONTEND_PID=$FRONTEND_PID" >> .itiyum_pids

print_success "PIDs saved to .itiyum_pids"
print_success "Launch complete! 🎉"

