#!/bin/bash

# Itiyum Platform Launch Script
# This script starts PostgreSQL, Backend, and Frontend servers
# Supports both Docker mode (recommended) and local mode

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

# Function to check if Docker is available
check_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        if docker info &> /dev/null; then
            return 0
        fi
    fi
    return 1
}

echo ""
echo "=========================================="
echo "   🚀 ITIYUM PLATFORM LAUNCHER 🚀"
echo "=========================================="
echo ""

# Parse command line arguments
USE_DOCKER=false
USE_LOCAL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --docker|-d)
            USE_DOCKER=true
            shift
            ;;
        --local|-l)
            USE_LOCAL=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --docker, -d    Force Docker mode (recommended)"
            echo "  --local, -l     Force local mode (requires local PostgreSQL)"
            echo "  --help, -h      Show this help message"
            echo ""
            echo "Without options, Docker mode is used if available, otherwise local mode."
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Determine which mode to use
if [ "$USE_DOCKER" = true ]; then
    if ! check_docker; then
        print_error "Docker requested but not available or not running"
        exit 1
    fi
    print_status "Using Docker mode (forced)"
elif [ "$USE_LOCAL" = true ]; then
    print_status "Using local mode (forced)"
elif check_docker; then
    USE_DOCKER=true
    print_status "Docker detected - using Docker mode (recommended)"
else
    print_status "Docker not available - using local mode"
fi

# ========================================
# DOCKER MODE
# ========================================
if [ "$USE_DOCKER" = true ]; then
    print_status "Starting Itiyum Platform with Docker..."

    # Stop any existing containers
    print_status "Stopping any existing containers..."
    docker-compose down 2>/dev/null || true

    # Build and start containers
    print_status "Building and starting Docker containers..."
    print_warning "This may take a few minutes on first run..."

    docker-compose up -d --build

    # Wait for services to be ready
    print_status "Waiting for services to start..."

    # Wait for backend
    print_status "Waiting for backend to be ready..."
    for i in {1..60}; do
        if curl -s http://localhost:3001/api/auth/status > /dev/null 2>&1; then
            print_success "Backend is ready"
            break
        fi
        if [ $i -eq 60 ]; then
            print_error "Backend failed to start. Check logs with: docker logs itiyum-backend"
            exit 1
        fi
        sleep 2
    done

    # Wait for frontend
    print_status "Waiting for frontend to be ready..."
    print_warning "Frontend may take 30-60 seconds to compile..."
    for i in {1..90}; do
        if curl -s http://localhost:4200 > /dev/null 2>&1; then
            print_success "Frontend is ready"
            break
        fi
        if [ $((i % 15)) -eq 0 ]; then
            print_status "Still waiting for frontend... ($i seconds)"
        fi
        if [ $i -eq 90 ]; then
            print_error "Frontend failed to start. Check logs with: docker logs itiyum-frontend"
            exit 1
        fi
        sleep 1
    done

    # Summary
    echo ""
    echo "=========================================="
    echo "   ✅ ALL SERVICES STARTED (DOCKER MODE)"
    echo "=========================================="
    echo ""
    echo "📊 Service Status:"
    echo "  • PostgreSQL:  ✅ Running (container: itiyum-postgres)"
    echo "  • Backend:     ✅ Running (container: itiyum-backend)"
    echo "  • Frontend:    ✅ Running (container: itiyum-frontend)"
    echo ""
    echo "🌐 Access URLs:"
    echo "  • Frontend:    http://localhost:4200"
    echo "  • Backend API: http://localhost:3001/api"
    echo "  • Login Page:  http://localhost:4200/login"
    echo ""
    echo "📝 Logs:"
    echo "  • Backend:     docker logs -f itiyum-backend"
    echo "  • Frontend:    docker logs -f itiyum-frontend"
    echo "  • Database:    docker logs -f itiyum-postgres"
    echo ""
    echo "🛑 To stop all services:"
    echo "  • docker-compose down"
    echo "  • Or use: ./stop_entire_product.sh"
    echo ""
    echo "🔐 Admin Login:"
    echo "  • Email:    admin@itiyum.com"
    echo "  • Password: Admin@123"
    echo ""
    echo "=========================================="
    echo ""
    print_success "Launch complete (Docker mode)! 🎉"

    # Save mode to file for stop script
    echo "MODE=docker" > .itiyum_pids

    exit 0
fi

# ========================================
# LOCAL MODE (Original behavior)
# ========================================
print_status "Starting Itiyum Platform in local mode..."

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

# Step 2: Verify database exists and is initialized
print_status "Checking database..."
if psql -U michaelkateregga -d itiyum_platform -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Database 'itiyum_platform' is accessible"

    # Check if database has tables (is initialized)
    print_status "Checking if database is initialized..."
    TABLE_COUNT=$(psql -U michaelkateregga -d itiyum_platform -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | xargs)

    if [ "$TABLE_COUNT" -eq 0 ]; then
        print_warning "Database is empty. Initializing schema and admin user..."

        # Run database migrations using the backend script
        cd backend
        print_status "Running database migrations..."
        node scripts/run-migrations.js

        if [ $? -eq 0 ]; then
            print_success "Database initialized successfully"
            print_success "Admin user created: admin@itiyum.com / Admin@123"
        else
            print_error "Database initialization failed"
            print_error "Please check the error messages above"
            cd ..
            exit 1
        fi
        cd ..
    else
        print_success "Database schema is initialized ($TABLE_COUNT tables found)"
    fi
else
    print_error "Database 'itiyum_platform' is not accessible"
    print_warning "Creating database..."

    # Try to create the database
    if createdb -U michaelkateregga itiyum_platform 2>/dev/null; then
        print_success "Database created successfully"

        # Initialize the database
        print_status "Initializing database schema..."
        cd backend
        node scripts/run-migrations.js

        if [ $? -eq 0 ]; then
            print_success "Database initialized successfully"
            print_success "Admin user created: admin@itiyum.com / Admin@123"
        else
            print_error "Database initialization failed"
            cd ..
            exit 1
        fi
        cd ..
    else
        print_error "Failed to create database"
        print_warning "Please create the database manually: createdb itiyum_platform"
        exit 1
    fi
fi

# Step 3: Load nvm and check Node.js version
print_status "Setting up Node.js environment..."

# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    \. "$NVM_DIR/nvm.sh"
    print_success "nvm loaded successfully"

    # Required Node.js version (Angular CLI requirement)
    REQUIRED_NODE_VERSION="22.12.0"

    # Check if required version is installed
    if nvm ls "$REQUIRED_NODE_VERSION" &> /dev/null; then
        print_status "Switching to Node.js $REQUIRED_NODE_VERSION..."
        nvm use "$REQUIRED_NODE_VERSION" > /dev/null 2>&1
        print_success "Using Node.js $(node --version)"
    else
        print_warning "Node.js $REQUIRED_NODE_VERSION not found. Installing..."
        nvm install "$REQUIRED_NODE_VERSION"
        nvm use "$REQUIRED_NODE_VERSION"
        print_success "Installed and using Node.js $(node --version)"
    fi
else
    print_warning "nvm not found at $NVM_DIR"
    print_status "Current Node.js version: $(node --version)"

    # Check if current Node.js version meets minimum requirements
    CURRENT_VERSION=$(node --version | sed 's/v//')
    MAJOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f1)
    MINOR_VERSION=$(echo $CURRENT_VERSION | cut -d. -f2)

    # Angular CLI requires Node.js >= 20.19 or >= 22.12
    if [ "$MAJOR_VERSION" -eq 20 ] && [ "$MINOR_VERSION" -lt 19 ]; then
        print_error "Node.js version $CURRENT_VERSION is too old"
        print_error "Angular CLI requires Node.js >= v20.19 or >= v22.12"
        print_error "Please install nvm and run this script again, or upgrade your system Node.js"
        print_error ""
        print_error "To install nvm, run:"
        print_error "  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
        exit 1
    elif [ "$MAJOR_VERSION" -eq 21 ]; then
        print_error "Node.js version $CURRENT_VERSION is not supported"
        print_error "Angular CLI requires Node.js >= v20.19 or >= v22.12"
        print_error "Please install nvm and run this script again"
        exit 1
    elif [ "$MAJOR_VERSION" -eq 22 ] && [ "$MINOR_VERSION" -lt 12 ]; then
        print_error "Node.js version $CURRENT_VERSION is too old"
        print_error "Angular CLI requires Node.js >= v22.12"
        print_error "Please install nvm and run this script again, or upgrade your system Node.js"
        exit 1
    fi

    print_success "Node.js version meets requirements"
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

