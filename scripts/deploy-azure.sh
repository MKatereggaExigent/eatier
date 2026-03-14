#!/bin/bash
#===============================================================================
# ITIYUM PLATFORM - AZURE DEPLOYMENT QUICK START
#===============================================================================
# Wrapper script for easy Azure deployment
#
# Usage:
#   ./deploy-azure.sh                    # Interactive mode
#   ./deploy-azure.sh dev setup          # Setup development
#   ./deploy-azure.sh staging deploy     # Deploy to staging
#   ./deploy-azure.sh prod migrate       # Run production migrations
#===============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

show_banner() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                              ║${NC}"
    echo -e "${BLUE}║     ${GREEN}ITIYUM PLATFORM - AZURE DEPLOYMENT${BLUE}                      ║${NC}"
    echo -e "${BLUE}║                                                              ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

show_menu() {
    echo -e "${YELLOW}Select Environment:${NC}"
    echo "  1) Development"
    echo "  2) Staging"
    echo "  3) Production"
    echo ""
    read -p "Enter choice [1-3]: " env_choice
    
    case $env_choice in
        1) ENV="dev" ;;
        2) ENV="staging" ;;
        3) ENV="prod" ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
    
    echo ""
    echo -e "${YELLOW}Select Action:${NC}"
    echo "  1) Setup (create infrastructure)"
    echo "  2) Deploy (build & push images)"
    echo "  3) Migrate (run database migrations)"
    echo "  4) Destroy (delete all resources)"
    echo ""
    read -p "Enter choice [1-4]: " action_choice
    
    case $action_choice in
        1) ACTION="setup" ;;
        2) ACTION="deploy" ;;
        3) ACTION="migrate" ;;
        4) ACTION="destroy" ;;
        *) echo "Invalid choice"; exit 1 ;;
    esac
}

# Main
show_banner

if [ $# -eq 0 ]; then
    # Interactive mode
    show_menu
elif [ $# -eq 2 ]; then
    ENV="$1"
    ACTION="$2"
else
    echo "Usage: $0 [environment] [action]"
    echo ""
    echo "Environments: dev, staging, prod"
    echo "Actions: setup, deploy, migrate, destroy"
    echo ""
    echo "Examples:"
    echo "  $0 dev setup       # Setup development infrastructure"
    echo "  $0 staging deploy  # Deploy to staging"
    echo "  $0 prod migrate    # Run production migrations"
    exit 1
fi

echo ""
echo -e "${GREEN}Environment: $ENV${NC}"
echo -e "${GREEN}Action: $ACTION${NC}"
echo ""

# Run the main setup script
"$SCRIPT_DIR/azure/scripts/setup-azure.sh" "$ENV" "$ACTION"

