#!/bin/bash

# ===================================
# ITIYUM PLATFORM STARTUP SCRIPT
# Complete Development Environment Setup
# ===================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="itiyum_platform"
DB_USER="itiyum_user"
DB_PASSWORD="itiyum_secure_password_2024"
DB_HOST="localhost"
DB_PORT="5432"
BACKEND_PORT="3000"
FRONTEND_PORT="4200"

# Print banner
print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🍽️  ITIYUM PLATFORM  🍽️                    ║"
    echo "║                  Complete Startup Script                    ║"
    echo "║                                                              ║"
    echo "║  🔧 Database Setup    🚀 Backend API    🌐 Frontend App      ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i :$1 >/dev/null 2>&1
}

# Function to kill process on port
kill_port() {
    local port=$1
    local pid=$(lsof -ti :$port)
    if [ ! -z "$pid" ]; then
        echo -e "${YELLOW}Killing process on port $port (PID: $pid)${NC}"
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Function to find PostgreSQL installation
find_postgresql() {
    POSTGRES_PATHS=(
        "/usr/local/bin"
        "/usr/local/pgsql/bin"
        "/opt/homebrew/bin"
        "/Library/PostgreSQL/*/bin"
        "/Applications/Postgres.app/Contents/Versions/*/bin"
        "/usr/bin"
    )

    for path in "${POSTGRES_PATHS[@]}"; do
        if [ -f "$path/psql" ]; then
            export PATH="$path:$PATH"
            echo -e "${GREEN}✓ Found PostgreSQL at: $path${NC}"
            return 0
        fi
    done
    return 1
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

    # Check Node.js
    if ! command_exists node; then
        echo -e "${RED}❌ Node.js not found!${NC}"
        echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

    # Check npm
    if ! command_exists npm; then
        echo -e "${RED}❌ npm not found!${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ npm $(npm --version)${NC}"

    # Check Angular CLI
    if ! command_exists ng; then
        echo -e "${YELLOW}⚠️  Angular CLI not found, installing globally...${NC}"
        npm install -g @angular/cli
    fi
    echo -e "${GREEN}✓ Angular CLI $(ng version --version 2>/dev/null || echo 'installed')${NC}"

    # Check PostgreSQL
    if ! command_exists psql; then
        echo -e "${YELLOW}PostgreSQL not found in PATH, searching...${NC}"
        if ! find_postgresql; then
            echo -e "${RED}❌ PostgreSQL not found!${NC}"
            echo -e "${YELLOW}Please install PostgreSQL:${NC}"
            echo -e "${BLUE}  • Homebrew: brew install postgresql${NC}"
            echo -e "${BLUE}  • PostgreSQL.app: https://postgresapp.com/${NC}"
            echo -e "${BLUE}  • Official installer: https://www.postgresql.org/download/${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ PostgreSQL $(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1)${NC}"
}

# Setup database
setup_database() {
    echo -e "${BLUE}🗄️  Setting up database...${NC}"

    # Check if PostgreSQL is running
    if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  PostgreSQL is not running, attempting to start...${NC}"

        # Try different methods to start PostgreSQL
        if command_exists brew; then
            brew services start postgresql 2>/dev/null || true
        fi

        # Wait a moment and check again
        sleep 3
        if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
            echo -e "${RED}❌ Could not start PostgreSQL automatically${NC}"
            echo -e "${YELLOW}Please start PostgreSQL manually:${NC}"
            echo -e "${BLUE}  • Homebrew: brew services start postgresql${NC}"
            echo -e "${BLUE}  • PostgreSQL.app: Start the application${NC}"
            echo -e "${BLUE}  • System service: sudo systemctl start postgresql${NC}"
            exit 1
        fi
    fi
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"

    # Check if database exists
    if ! psql -h $DB_HOST -p $DB_PORT -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw $DB_NAME; then
        echo -e "${YELLOW}Database '$DB_NAME' not found, setting up...${NC}"
        cd database
        chmod +x setup_database.sh
        echo "y" | ./setup_database.sh
        cd ..
    else
        echo -e "${GREEN}✓ Database '$DB_NAME' already exists${NC}"
    fi
}

# Create backend environment file
create_backend_env() {
    echo -e "${BLUE}⚙️  Configuring backend environment...${NC}"

    cat > backend/.env << EOF
# Database Configuration
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

# Server Configuration
PORT=$BACKEND_PORT
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=24h

# CORS Configuration
CORS_ORIGIN=http://localhost:$FRONTEND_PORT
EOF

    echo -e "${GREEN}✓ Backend .env file created${NC}"
}

# Install dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing dependencies...${NC}"

    # Frontend dependencies
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"

    # Backend dependencies
    echo -e "${YELLOW}Installing backend dependencies...${NC}"
    cd backend
    npm install
    cd ..
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
}

# Start services
start_services() {
    echo -e "${BLUE}🚀 Starting services...${NC}"

    # Kill any existing processes on our ports
    if port_in_use $BACKEND_PORT; then
        kill_port $BACKEND_PORT
    fi

    if port_in_use $FRONTEND_PORT; then
        kill_port $FRONTEND_PORT
    fi

    # Start backend
    echo -e "${YELLOW}Starting backend server on port $BACKEND_PORT...${NC}"
    cd backend
    npm run dev > ../backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"

    # Wait for backend to start
    echo -e "${YELLOW}Waiting for backend to start...${NC}"
    for i in {1..30}; do
        if curl -s http://localhost:$BACKEND_PORT/health >/dev/null 2>&1; then
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo -e "${RED}❌ Backend failed to start within 30 seconds${NC}"
            echo -e "${YELLOW}Check backend.log for details${NC}"
        fi
    done

    # Start frontend
    echo -e "${YELLOW}Starting frontend server on port $FRONTEND_PORT...${NC}"
    ng serve --port $FRONTEND_PORT --host 0.0.0.0 > frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

    # Wait for frontend to start
    echo -e "${YELLOW}Waiting for frontend to start...${NC}"
    for i in {1..60}; do
        if curl -s http://localhost:$FRONTEND_PORT >/dev/null 2>&1; then
            break
        fi
        sleep 1
        if [ $i -eq 60 ]; then
            echo -e "${RED}❌ Frontend failed to start within 60 seconds${NC}"
            echo -e "${YELLOW}Check frontend.log for details${NC}"
        fi
    done
}

# Open browser
open_browser() {
    echo -e "${BLUE}🌐 Opening browser...${NC}"
    sleep 3

    if command_exists open; then
        # macOS
        open http://localhost:$FRONTEND_PORT
    elif command_exists xdg-open; then
        # Linux
        xdg-open http://localhost:$FRONTEND_PORT
    elif command_exists start; then
        # Windows
        start http://localhost:$FRONTEND_PORT
    else
        echo -e "${YELLOW}Please open http://localhost:$FRONTEND_PORT in your browser${NC}"
    fi
}

# Cleanup function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"

    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Backend stopped${NC}"
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi

    # Kill any remaining processes on our ports
    kill_port $BACKEND_PORT
    kill_port $FRONTEND_PORT

    echo -e "${CYAN}👋 Itiyum platform stopped. Thanks for using!${NC}"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    print_banner
    check_prerequisites
    setup_database
    create_backend_env
    install_dependencies
    start_services

    echo -e "${GREEN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║                    🎉 ITIYUM IS READY! 🎉                    ║"
    echo "║                                                              ║"
    echo "║  🌐 Frontend: http://localhost:$FRONTEND_PORT                           ║"
    echo "║  🚀 Backend:  http://localhost:$BACKEND_PORT                            ║"
    echo "║  🗄️  Database: $DB_NAME on localhost:$DB_PORT              ║"
    echo "║                                                              ║"
    echo "║  📝 Logs: frontend.log & backend.log                        ║"
    echo "║  🛑 Stop: Press Ctrl+C                                       ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"

    open_browser

    # Keep script running
    echo -e "${BLUE}🔄 Services running... Press Ctrl+C to stop${NC}"
    while true; do
        sleep 1
    done
}

# Run main function
main "$@"
