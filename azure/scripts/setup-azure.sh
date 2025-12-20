#!/bin/bash
#===============================================================================
# ITIYUM PLATFORM - AZURE DEPLOYMENT SETUP SCRIPT
#===============================================================================
# This script sets up the entire Azure infrastructure for the Itiyum platform
# including development, staging, and production environments.
#
# Prerequisites:
#   - Azure CLI installed and logged in (az login)
#   - Docker installed
#   - Node.js 20+ installed
#   - Git installed
#
# Usage:
#   ./setup-azure.sh [environment] [action]
#
#   Environments: dev, staging, prod
#   Actions: setup, deploy, destroy
#
# Examples:
#   ./setup-azure.sh dev setup      # Setup development environment
#   ./setup-azure.sh staging deploy # Deploy to staging
#   ./setup-azure.sh prod setup     # Setup production environment
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project configuration
PROJECT_NAME="itiyum"
LOCATION="eastus"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_header() {
    echo ""
    print_message "$BLUE" "╔══════════════════════════════════════════════════════════════╗"
    print_message "$BLUE" "║  $1"
    print_message "$BLUE" "╚══════════════════════════════════════════════════════════════╝"
    echo ""
}

print_success() { print_message "$GREEN" "✅ $1"; }
print_warning() { print_message "$YELLOW" "⚠️  $1"; }
print_error() { print_message "$RED" "❌ $1"; }
print_info() { print_message "$BLUE" "ℹ️  $1"; }

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"

    local missing=0

    # Check Azure CLI
    if ! command -v az &> /dev/null; then
        print_error "Azure CLI is not installed. Install from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
        missing=1
    else
        print_success "Azure CLI installed: $(az version --query '\"azure-cli\"' -o tsv)"
    fi

    # Check if logged in to Azure
    if ! az account show &> /dev/null; then
        print_error "Not logged in to Azure. Run: az login"
        missing=1
    else
        print_success "Logged in to Azure: $(az account show --query 'name' -o tsv)"
    fi

    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Install from: https://docs.docker.com/get-docker/"
        missing=1
    else
        print_success "Docker installed: $(docker --version)"
    fi

    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Install from: https://nodejs.org/"
        missing=1
    else
        print_success "Node.js installed: $(node --version)"
    fi

    # Check Git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed"
        missing=1
    else
        print_success "Git installed: $(git --version)"
    fi

    if [ $missing -eq 1 ]; then
        print_error "Missing prerequisites. Please install them and try again."
        exit 1
    fi

    print_success "All prerequisites met!"
}

# Set environment variables based on environment
set_environment() {
    local env=$1

    case $env in
        dev|development)
            ENV_NAME="dev"
            ENV_SUFFIX="dev"
            SKU_PLAN="B1"
            DB_SKU="B_Gen5_1"
            REPLICAS=1
            ;;
        staging)
            ENV_NAME="staging"
            ENV_SUFFIX="stg"
            SKU_PLAN="B2"
            DB_SKU="GP_Gen5_2"
            REPLICAS=2
            ;;
        prod|production)
            ENV_NAME="prod"
            ENV_SUFFIX="prd"
            SKU_PLAN="P1v2"
            DB_SKU="GP_Gen5_4"
            REPLICAS=3
            ;;
        *)
            print_error "Invalid environment: $env. Use: dev, staging, or prod"
            exit 1
            ;;
    esac

    # Resource names (Azure naming conventions)
    RESOURCE_GROUP="rg-${PROJECT_NAME}-${ENV_SUFFIX}"
    ACR_NAME="${PROJECT_NAME}acr${ENV_SUFFIX}"
    APP_SERVICE_PLAN="asp-${PROJECT_NAME}-${ENV_SUFFIX}"
    WEBAPP_BACKEND="app-${PROJECT_NAME}-api-${ENV_SUFFIX}"
    WEBAPP_FRONTEND="app-${PROJECT_NAME}-web-${ENV_SUFFIX}"
    POSTGRES_SERVER="psql-${PROJECT_NAME}-${ENV_SUFFIX}"
    KEY_VAULT="kv-${PROJECT_NAME}-${ENV_SUFFIX}"
    LOG_ANALYTICS="log-${PROJECT_NAME}-${ENV_SUFFIX}"
    APP_INSIGHTS="appi-${PROJECT_NAME}-${ENV_SUFFIX}"
    STORAGE_ACCOUNT="${PROJECT_NAME}storage${ENV_SUFFIX}"

    print_info "Environment: $ENV_NAME"
    print_info "Resource Group: $RESOURCE_GROUP"
}

# Create Azure Resource Group
create_resource_group() {
    print_header "Creating Resource Group: $RESOURCE_GROUP"

    if az group show --name "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Resource group already exists"
    else
        az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none
        print_success "Resource group created"
    fi
}

# Create Azure Container Registry
create_container_registry() {
    print_header "Creating Azure Container Registry: $ACR_NAME"

    if az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Container Registry already exists"
    else
        az acr create \
            --resource-group "$RESOURCE_GROUP" \
            --name "$ACR_NAME" \
            --sku Basic \
            --admin-enabled true \
            --output none
        print_success "Container Registry created"
    fi

    # Get ACR credentials
    ACR_LOGIN_SERVER=$(az acr show --name "$ACR_NAME" --query loginServer -o tsv)
    ACR_USERNAME=$(az acr credential show --name "$ACR_NAME" --query username -o tsv)
    ACR_PASSWORD=$(az acr credential show --name "$ACR_NAME" --query "passwords[0].value" -o tsv)

    print_info "ACR Login Server: $ACR_LOGIN_SERVER"
}

# Create PostgreSQL Flexible Server
create_postgresql() {
    print_header "Creating PostgreSQL Flexible Server: $POSTGRES_SERVER"

    # Generate secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
    DB_NAME="itiyum_${ENV_SUFFIX}"
    DB_USER="itiyum_admin"

    if az postgres flexible-server show --name "$POSTGRES_SERVER" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "PostgreSQL server already exists"
    else
        az postgres flexible-server create \
            --resource-group "$RESOURCE_GROUP" \
            --name "$POSTGRES_SERVER" \
            --location "$LOCATION" \
            --admin-user "$DB_USER" \
            --admin-password "$DB_PASSWORD" \
            --sku-name "Standard_B1ms" \
            --tier "Burstable" \
            --storage-size 32 \
            --version 14 \
            --public-access 0.0.0.0 \
            --output none

        # Create database
        az postgres flexible-server db create \
            --resource-group "$RESOURCE_GROUP" \
            --server-name "$POSTGRES_SERVER" \
            --database-name "$DB_NAME" \
            --output none

        print_success "PostgreSQL server and database created"
    fi

    # Get connection string
    POSTGRES_HOST="${POSTGRES_SERVER}.postgres.database.azure.com"
    print_info "PostgreSQL Host: $POSTGRES_HOST"
}

# Create Key Vault for secrets
create_key_vault() {
    print_header "Creating Key Vault: $KEY_VAULT"

    if az keyvault show --name "$KEY_VAULT" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Key Vault already exists"
    else
        az keyvault create \
            --resource-group "$RESOURCE_GROUP" \
            --name "$KEY_VAULT" \
            --location "$LOCATION" \
            --enable-rbac-authorization false \
            --output none
        print_success "Key Vault created"
    fi

    # Store secrets
    print_info "Storing secrets in Key Vault..."
    az keyvault secret set --vault-name "$KEY_VAULT" --name "db-password" --value "$DB_PASSWORD" --output none 2>/dev/null || true
    az keyvault secret set --vault-name "$KEY_VAULT" --name "jwt-secret" --value "$(openssl rand -base64 64)" --output none 2>/dev/null || true
    az keyvault secret set --vault-name "$KEY_VAULT" --name "acr-password" --value "$ACR_PASSWORD" --output none 2>/dev/null || true

    print_success "Secrets stored in Key Vault"
}

# Create App Service Plan
create_app_service_plan() {
    print_header "Creating App Service Plan: $APP_SERVICE_PLAN"

    if az appservice plan show --name "$APP_SERVICE_PLAN" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "App Service Plan already exists"
    else
        az appservice plan create \
            --resource-group "$RESOURCE_GROUP" \
            --name "$APP_SERVICE_PLAN" \
            --sku "$SKU_PLAN" \
            --is-linux \
            --output none
        print_success "App Service Plan created"
    fi
}

# Create Backend Web App
create_backend_webapp() {
    print_header "Creating Backend Web App: $WEBAPP_BACKEND"

    if az webapp show --name "$WEBAPP_BACKEND" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Backend Web App already exists"
    else
        az webapp create \
            --resource-group "$RESOURCE_GROUP" \
            --plan "$APP_SERVICE_PLAN" \
            --name "$WEBAPP_BACKEND" \
            --deployment-container-image-name "node:20-alpine" \
            --output none
        print_success "Backend Web App created"
    fi

    # Configure app settings
    print_info "Configuring backend settings..."
    az webapp config appsettings set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$WEBAPP_BACKEND" \
        --settings \
            NODE_ENV="$ENV_NAME" \
            PORT=3001 \
            DB_HOST="$POSTGRES_HOST" \
            DB_PORT=5432 \
            DB_NAME="$DB_NAME" \
            DB_USER="$DB_USER" \
            DB_PASSWORD="$DB_PASSWORD" \
            WEBSITES_PORT=3001 \
        --output none

    print_success "Backend Web App configured"
}

# Create Frontend Web App
create_frontend_webapp() {
    print_header "Creating Frontend Web App: $WEBAPP_FRONTEND"

    if az webapp show --name "$WEBAPP_FRONTEND" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
        print_warning "Frontend Web App already exists"
    else
        az webapp create \
            --resource-group "$RESOURCE_GROUP" \
            --plan "$APP_SERVICE_PLAN" \
            --name "$WEBAPP_FRONTEND" \
            --deployment-container-image-name "nginx:alpine" \
            --output none
        print_success "Frontend Web App created"
    fi

    # Get backend URL
    BACKEND_URL="https://${WEBAPP_BACKEND}.azurewebsites.net"

    # Configure app settings
    print_info "Configuring frontend settings..."
    az webapp config appsettings set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$WEBAPP_FRONTEND" \
        --settings \
            API_URL="$BACKEND_URL" \
            NODE_ENV="$ENV_NAME" \
        --output none

    print_success "Frontend Web App configured"
}


# Build and push Docker images
build_and_push_images() {
    print_header "Building and Pushing Docker Images"

    # Login to ACR
    print_info "Logging in to Azure Container Registry..."
    az acr login --name "$ACR_NAME"

    # Build and push backend image
    print_info "Building backend image..."
    docker build -t "$ACR_LOGIN_SERVER/itiyum-backend:$ENV_NAME" -t "$ACR_LOGIN_SERVER/itiyum-backend:latest" -f "$ROOT_DIR/backend/Dockerfile" "$ROOT_DIR/backend"
    docker push "$ACR_LOGIN_SERVER/itiyum-backend:$ENV_NAME"
    docker push "$ACR_LOGIN_SERVER/itiyum-backend:latest"
    print_success "Backend image pushed"

    # Build and push frontend image
    print_info "Building frontend image..."
    docker build -t "$ACR_LOGIN_SERVER/itiyum-frontend:$ENV_NAME" -t "$ACR_LOGIN_SERVER/itiyum-frontend:latest" -f "$ROOT_DIR/azure/docker/Dockerfile.frontend.prod" "$ROOT_DIR"
    docker push "$ACR_LOGIN_SERVER/itiyum-frontend:$ENV_NAME"
    docker push "$ACR_LOGIN_SERVER/itiyum-frontend:latest"
    print_success "Frontend image pushed"
}

# Deploy images to Web Apps
deploy_images() {
    print_header "Deploying Images to Web Apps"

    # Deploy backend
    print_info "Deploying backend..."
    az webapp config container set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$WEBAPP_BACKEND" \
        --docker-custom-image-name "$ACR_LOGIN_SERVER/itiyum-backend:$ENV_NAME" \
        --docker-registry-server-url "https://$ACR_LOGIN_SERVER" \
        --docker-registry-server-user "$ACR_USERNAME" \
        --docker-registry-server-password "$ACR_PASSWORD" \
        --output none
    print_success "Backend deployed"

    # Deploy frontend
    print_info "Deploying frontend..."
    az webapp config container set \
        --resource-group "$RESOURCE_GROUP" \
        --name "$WEBAPP_FRONTEND" \
        --docker-custom-image-name "$ACR_LOGIN_SERVER/itiyum-frontend:$ENV_NAME" \
        --docker-registry-server-url "https://$ACR_LOGIN_SERVER" \
        --docker-registry-server-user "$ACR_USERNAME" \
        --docker-registry-server-password "$ACR_PASSWORD" \
        --output none
    print_success "Frontend deployed"
}

# Run database migrations
run_migrations() {
    print_header "Running Database Migrations"

    print_info "This will run migrations against: $POSTGRES_HOST"

    # Export environment variables for migration script
    export DB_HOST="$POSTGRES_HOST"
    export DB_PORT=5432
    export DB_NAME="$DB_NAME"
    export DB_USER="$DB_USER"
    export DB_PASSWORD="$DB_PASSWORD"
    export DB_SSL=true

    cd "$ROOT_DIR/backend"
    node scripts/run-migrations.js

    print_success "Migrations completed"
}

# Generate environment file
generate_env_file() {
    local env_file="$ROOT_DIR/.env.$ENV_NAME"

    print_header "Generating Environment File: $env_file"

    cat > "$env_file" << EOF
# =============================================================================
# ITIYUM PLATFORM - ${ENV_NAME^^} ENVIRONMENT CONFIGURATION
# =============================================================================
# Generated: $(date)
# Environment: $ENV_NAME
# =============================================================================

# -----------------------------------------------------------------------------
# APPLICATION SETTINGS
# -----------------------------------------------------------------------------
NODE_ENV=$ENV_NAME
PORT=3001

# -----------------------------------------------------------------------------
# DATABASE CONFIGURATION (Azure PostgreSQL)
# -----------------------------------------------------------------------------
DB_HOST=$POSTGRES_HOST
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_SSL=true
DATABASE_URL=postgres://$DB_USER:$DB_PASSWORD@$POSTGRES_HOST:5432/$DB_NAME?sslmode=require

# -----------------------------------------------------------------------------
# AUTHENTICATION & SECURITY
# -----------------------------------------------------------------------------
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_EXPIRES_IN=30m
JWT_REFRESH_EXPIRES_IN=7d

# -----------------------------------------------------------------------------
# CORS & FRONTEND
# -----------------------------------------------------------------------------
CORS_ORIGIN=https://${WEBAPP_FRONTEND}.azurewebsites.net
FRONTEND_URL=https://${WEBAPP_FRONTEND}.azurewebsites.net
API_URL=https://${WEBAPP_BACKEND}.azurewebsites.net

# -----------------------------------------------------------------------------
# AZURE RESOURCES
# -----------------------------------------------------------------------------
AZURE_RESOURCE_GROUP=$RESOURCE_GROUP
AZURE_ACR_NAME=$ACR_NAME
AZURE_ACR_LOGIN_SERVER=$ACR_LOGIN_SERVER
AZURE_KEY_VAULT=$KEY_VAULT
AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT

# -----------------------------------------------------------------------------
# EXTERNAL SERVICES (Add your API keys)
# -----------------------------------------------------------------------------
# OPENAI_API_KEY=your-openai-key
# GOOGLE_MAPS_API_KEY=your-google-maps-key
# GOOGLE_CLIENT_ID=your-google-client-id
# GOOGLE_CLIENT_SECRET=your-google-client-secret
# SENDGRID_API_KEY=your-sendgrid-key

# -----------------------------------------------------------------------------
# FILE UPLOADS (Azure Blob Storage)
# -----------------------------------------------------------------------------
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=uploads

# -----------------------------------------------------------------------------
# MONITORING & LOGGING
# -----------------------------------------------------------------------------
APPLICATIONINSIGHTS_CONNECTION_STRING=
LOG_LEVEL=info
EOF

    print_success "Environment file generated: $env_file"
}

# Print deployment summary
print_summary() {
    print_header "Deployment Summary"

    echo ""
    print_message "$GREEN" "🎉 Azure Infrastructure Setup Complete!"
    echo ""
    print_message "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    print_info "Environment: $ENV_NAME"
    print_info "Resource Group: $RESOURCE_GROUP"
    echo ""
    print_message "$YELLOW" "📦 Resources Created:"
    echo "   • Container Registry: $ACR_NAME"
    echo "   • PostgreSQL Server: $POSTGRES_SERVER"
    echo "   • Key Vault: $KEY_VAULT"
    echo "   • App Service Plan: $APP_SERVICE_PLAN"
    echo "   • Backend App: $WEBAPP_BACKEND"
    echo "   • Frontend App: $WEBAPP_FRONTEND"
    echo ""
    print_message "$YELLOW" "🔗 URLs:"
    echo "   • Frontend: https://${WEBAPP_FRONTEND}.azurewebsites.net"
    echo "   • Backend API: https://${WEBAPP_BACKEND}.azurewebsites.net"
    echo "   • ACR: https://$ACR_LOGIN_SERVER"
    echo ""
    print_message "$YELLOW" "📝 Next Steps:"
    echo "   1. Review .env.$ENV_NAME file and add missing API keys"
    echo "   2. Run: ./setup-azure.sh $ENV_NAME deploy"
    echo "   3. Run: ./setup-azure.sh $ENV_NAME migrate"
    echo ""
    print_message "$BLUE" "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Destroy environment
destroy_environment() {
    print_header "Destroying Environment: $ENV_NAME"

    print_warning "This will delete ALL resources in resource group: $RESOURCE_GROUP"
    read -p "Are you sure? Type 'yes' to confirm: " confirm

    if [ "$confirm" = "yes" ]; then
        az group delete --name "$RESOURCE_GROUP" --yes --no-wait
        print_success "Resource group deletion initiated"
    else
        print_info "Destruction cancelled"
    fi
}

# Main execution
main() {
    local env="${1:-dev}"
    local action="${2:-setup}"

    print_header "ITIYUM PLATFORM - AZURE DEPLOYMENT"
    print_info "Environment: $env"
    print_info "Action: $action"

    check_prerequisites
    set_environment "$env"

    case $action in
        setup)
            create_resource_group
            create_container_registry
            create_postgresql
            create_key_vault
            create_app_service_plan
            create_backend_webapp
            create_frontend_webapp
            generate_env_file
            print_summary
            ;;
        deploy)
            create_container_registry  # Ensure ACR credentials are loaded
            build_and_push_images
            deploy_images
            ;;
        migrate)
            run_migrations
            ;;
        destroy)
            destroy_environment
            ;;
        *)
            print_error "Invalid action: $action"
            echo "Usage: $0 [dev|staging|prod] [setup|deploy|migrate|destroy]"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

