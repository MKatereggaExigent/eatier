#!/usr/bin/env bash

#######################################################################
# ITIYUM - Run All Database Migrations
#######################################################################
# This script runs ALL database migrations for the Itiyum platform.
# It works both locally and in Docker environments.
#
# Usage:
#   ./run_all_migrations.sh [options]
#
# Options:
#   --status     Show migration status without running
#   --force      Continue even if a migration fails
#   --docker     Run migrations inside Docker container
#   --help       Show this help message
#
# Examples:
#   ./run_all_migrations.sh              # Run all pending migrations
#   ./run_all_migrations.sh --status     # Show migration status
#   ./run_all_migrations.sh --docker     # Run inside Docker container
#######################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Default values
USE_DOCKER=false
MIGRATION_ARGS=""

# Parse arguments
for arg in "$@"; do
    case $arg in
        --docker)
            USE_DOCKER=true
            ;;
        --status)
            MIGRATION_ARGS="--status"
            ;;
        --force)
            MIGRATION_ARGS="--force"
            ;;
        --help|-h)
            echo "Usage: ./run_all_migrations.sh [options]"
            echo ""
            echo "Options:"
            echo "  --docker     Run migrations inside Docker container"
            echo "  --status     Show migration status without running"
            echo "  --force      Continue even if a migration fails"
            echo "  --help       Show this help message"
            echo ""
            echo "Examples:"
            echo "  ./run_all_migrations.sh              # Run locally"
            echo "  ./run_all_migrations.sh --docker     # Run in Docker"
            echo "  ./run_all_migrations.sh --status     # Show status"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $arg${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Print header
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         ITIYUM - Database Migration Runner                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ "$USE_DOCKER" = true ]; then
    # ========================================
    # DOCKER MODE
    # ========================================
    echo -e "${BLUE}🐳 Running migrations inside Docker container...${NC}"
    echo ""
    
    # Check if container exists
    if ! docker ps | grep -q itiyum-backend; then
        echo -e "${RED}❌ Error: itiyum-backend container is not running${NC}"
        echo ""
        echo "Start the backend first:"
        echo "  docker compose up -d"
        exit 1
    fi
    
    # Run migrations inside container
    docker exec itiyum-backend npm run migrate $MIGRATION_ARGS
    EXIT_CODE=$?
    
else
    # ========================================
    # LOCAL MODE
    # ========================================
    echo -e "${BLUE}💻 Running migrations locally...${NC}"
    echo ""
    
    # Check if backend directory exists
    if [ ! -d "backend" ]; then
        echo -e "${RED}❌ Error: backend directory not found${NC}"
        echo "Make sure you're in the project root directory"
        exit 1
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Error: Node.js is not installed${NC}"
        exit 1
    fi
    
    # Load environment variables
    if [ -f "backend/.env" ]; then
        echo -e "${GREEN}✓${NC} Loading environment from backend/.env"
        export $(grep -v '^#' backend/.env | xargs)
    fi
    
    # Run migrations
    cd backend
    node scripts/db-migrate.js $MIGRATION_ARGS
    EXIT_CODE=$?
fi

# Print result
echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ✅ Migrations Completed Successfully!         ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                  ❌ Migrations Failed!                     ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
fi

echo ""
exit $EXIT_CODE

