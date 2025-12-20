# Itiyum Platform - Azure Deployment Guide

This guide covers deploying the Itiyum platform to Microsoft Azure with support for **development**, **staging**, and **production** environments.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Azure CLI** installed and logged in (`az login`)
- **Docker** installed and running
- **Node.js 20+** installed
- **Git** installed
- An **Azure subscription** with sufficient permissions

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Azure Resource Group                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Frontend   │    │   Backend    │    │  PostgreSQL  │       │
│  │  (App Svc)   │───▶│  (App Svc)   │───▶│  (Flexible)  │       │
│  │   Angular    │    │   Node.js    │    │   Server     │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   Azure      │    │    Key       │    │   Storage    │       │
│  │   CDN        │    │   Vault      │    │   Account    │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│                              │                                   │
│                      ┌───────┴───────┐                          │
│                      │ Container     │                          │
│                      │ Registry      │                          │
│                      └───────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Option 1: Using the Setup Script (Recommended)

```bash
# Navigate to the azure scripts directory
cd azure/scripts

# Make the script executable
chmod +x setup-azure.sh

# Setup development environment
./setup-azure.sh dev setup

# Deploy to development
./setup-azure.sh dev deploy

# Run database migrations
./setup-azure.sh dev migrate
```

### Option 2: Using Bicep Templates

```bash
# Login to Azure
az login

# Create resource group
az group create --name rg-itiyum-dev --location eastus

# Deploy infrastructure
az deployment group create \
  --resource-group rg-itiyum-dev \
  --template-file azure/infrastructure/main.bicep \
  --parameters environment=dev \
               dbAdminPassword='YourSecurePassword123!' \
               jwtSecret='your-jwt-secret-minimum-64-chars'
```

## 📁 Directory Structure

```
azure/
├── docker/
│   ├── Dockerfile.backend.prod    # Production backend Dockerfile
│   ├── Dockerfile.frontend.prod   # Production frontend Dockerfile
│   └── nginx.conf                 # Nginx configuration for frontend
├── infrastructure/
│   └── main.bicep                 # Azure Bicep infrastructure template
├── scripts/
│   └── setup-azure.sh             # Main deployment script
└── README.md                      # This file

Root files:
├── azure-pipelines.yml            # Azure DevOps CI/CD pipeline
├── .env.development.template      # Development environment template
├── .env.staging.template          # Staging environment template
└── .env.production.template       # Production environment template
```

## 🌍 Environments

| Environment | Branch      | Resource Suffix | Description           |
|-------------|-------------|-----------------|----------------------|
| Development | development | -dev            | For active development |
| Staging     | staging     | -stg            | Pre-production testing |
| Production  | main        | -prd            | Live production        |

## 🔧 Configuration

### Environment Variables

Copy the appropriate template and fill in your values:

```bash
# For development
cp .env.development.template .env.development

# For staging
cp .env.staging.template .env.staging

# For production
cp .env.production.template .env.production
```

### Azure DevOps Setup

1. Create variable groups in Azure DevOps:
   - `itiyum-dev-variables`
   - `itiyum-staging-variables`
   - `itiyum-prod-variables`

2. Add service connections:
   - Docker Registry connection: `itiyum-acr-connection`
   - Azure subscription: `itiyum-azure-subscription`

## 💰 Estimated Costs (USD/month)

| Resource           | Dev    | Staging | Production |
|--------------------|--------|---------|------------|
| App Service Plan   | ~$13   | ~$26    | ~$70       |
| PostgreSQL         | ~$15   | ~$30    | ~$100      |
| Container Registry | ~$5    | ~$5     | ~$20       |
| Storage Account    | ~$1    | ~$2     | ~$10       |
| **Total**          | ~$34   | ~$63    | ~$200      |

*Costs vary by region and actual usage*

## 🔒 Security Best Practices

1. **Never commit `.env` files** with real credentials
2. Store secrets in **Azure Key Vault**
3. Use **managed identities** where possible
4. Enable **HTTPS only** on all web apps
5. Configure **firewall rules** for PostgreSQL
6. Rotate secrets regularly

## 📞 Support

For issues or questions, please open a GitHub issue.

