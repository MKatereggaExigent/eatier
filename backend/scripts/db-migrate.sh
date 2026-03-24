#!/bin/bash

#######################################################################
# Database Migration Script
# 
# This script runs all pending database migrations to bring your
# database to the latest state.
#
# Usage:
#   ./db-migrate.sh [options]
#
# Options:
#   status    Show migration status without running anything
#   force     Continue running migrations even if one fails
#   help      Show this help message
#
# Environment Variables (optional - can also be set in .env):
#   DB_HOST       Database host (default: localhost)
#   DB_PORT       Database port (default: 5432)
#   DB_NAME       Database name (default: itiyum_platform)
#   DB_USER       Database user (default: itiyum_user)
#   DB_PASSWORD   Database password
#
# Examples:
#   ./db-migrate.sh              # Run all pending migrations
#   ./db-migrate.sh status       # Show migration status
#   ./db-migrate.sh force        # Run migrations, continue on failure
#######################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

# Print header
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║           Database Migration Tool - Eatier/iTiyum          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Parse arguments
ARGS=""
for arg in "$@"; do
    case $arg in
        status)
            ARGS="--status"
            ;;
        force)
            ARGS="--force"
            ;;
        help|-h|--help)
            echo "Usage: ./db-migrate.sh [command]"
            echo ""
            echo "Commands:"
            echo "  (none)    Run all pending migrations"
            echo "  status    Show migration status without running"
            echo "  force     Run migrations, continue even if one fails"
            echo "  help      Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown argument: $arg${NC}"
            echo "Use './db-migrate.sh help' for usage information"
            exit 1
            ;;
    esac
done

# Check if we're in the right directory
if [ ! -f "$BACKEND_DIR/package.json" ]; then
    echo -e "${RED}Error: Cannot find backend/package.json${NC}"
    echo "Make sure you're running this script from the correct location"
    exit 1
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    echo "Please install Node.js to run migrations"
    exit 1
fi

# Load .env file if it exists
if [ -f "$BACKEND_DIR/.env" ]; then
    echo -e "${GREEN}✓${NC} Loading environment from .env file"
    export $(grep -v '^#' "$BACKEND_DIR/.env" | xargs)
fi

# Display database connection info (without password)
echo -e "${BLUE}Database:${NC} ${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-itiyum_platform}"
echo -e "${BLUE}User:${NC} ${DB_USER:-itiyum_user}"
echo ""

# Check if node_modules exists
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}Warning: node_modules not found. Installing dependencies...${NC}"
    cd "$BACKEND_DIR"
    npm install
    cd "$SCRIPT_DIR"
fi

# Run the migration script
echo -e "${GREEN}Running migrations...${NC}"
echo ""

cd "$BACKEND_DIR"
node scripts/db-migrate.js $ARGS
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                    Migration Complete!                     ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                    Migration Failed!                       ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
fi

exit $EXIT_CODE

