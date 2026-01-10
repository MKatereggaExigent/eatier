#!/usr/bin/env bash

# Eatier/Itiyum Backend Deployment Script
# This deploys the backend to your server via SSH and docker-compose

set -e

# Configuration - Update these for your setup
SERVER_HOST="41.76.109.131"       # Your server's IP or hostname
SERVER_USER="root"                 # SSH user
SERVER_PATH="/opt/itiyum"          # Path on server where app will be deployed
APP_NAME="itiyum"

echo ""
echo "🚀 Eatier/Itiyum Backend Deployment"
echo "===================================="
echo ""

# Step 1: Ensure we're in the project root
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: docker-compose.prod.yml not found. Please run this script from the project root."
    exit 1
fi

# Step 2: Create deployment package
echo "📦 Creating backend deployment package..."

# Create temp directory for packaging
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="${APP_NAME}-backend.tar.gz"

# Copy necessary files
cp -r backend "${TEMP_DIR}/"
cp -r database "${TEMP_DIR}/"
cp docker-compose.prod.yml "${TEMP_DIR}/docker-compose.yml"

# Create .env.example for server
cat <<EOF > "${TEMP_DIR}/.env"
# Eatier/Itiyum Production Environment Variables
# Copy this to .env and update values

# Database
DB_USER=itiyum
DB_PASSWORD=CHANGE_THIS_SECURE_PASSWORD
DB_NAME=itiyum

# JWT Secret (generate with: openssl rand -base64 64)
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_SECRET

# CORS Origin (your frontend URL)
CORS_ORIGIN=https://itiyum.aidocumines.com

# Google OAuth (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# SMTP Email (optional)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF

# Create tarball
cd "${TEMP_DIR}"
tar -czf ~/${PACKAGE_NAME} ./*
cd -

# Cleanup temp directory
rm -rf "${TEMP_DIR}"

echo "✅ Package created: ~/${PACKAGE_NAME}"

# Step 3: Deploy to server
echo ""
echo "📤 Deploying to server ${SERVER_HOST}..."

# Create directory on server
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}"

# Upload package
scp ~/${PACKAGE_NAME} ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/

# Extract and start on server
ssh ${SERVER_USER}@${SERVER_HOST} << ENDSSH
cd ${SERVER_PATH}
echo "📦 Extracting package..."
tar -xzf ${PACKAGE_NAME}
rm ${PACKAGE_NAME}

# Check if .env exists, if not create from template
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    echo "📝 Please update ${SERVER_PATH}/.env with your production values!"
fi

echo "🐳 Building and starting containers..."
docker-compose down 2>/dev/null || true
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "📋 Backend logs (last 20 lines):"
docker-compose logs --tail=20 backend
ENDSSH

echo ""
echo "✅ Backend deployment complete!"
echo ""
echo "📌 Next steps:"
echo "   1. SSH to server: ssh ${SERVER_USER}@${SERVER_HOST}"
echo "   2. Update .env: nano ${SERVER_PATH}/.env"
echo "   3. Restart if needed: cd ${SERVER_PATH} && docker-compose restart"
echo ""
echo "🔍 Check logs: ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${SERVER_PATH} && docker-compose logs -f'"
echo ""

