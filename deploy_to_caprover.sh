#!/usr/bin/env bash

# Eatier/Itiyum CapRover Deployment Script
# Run this ON THE SERVER after git pull
# This builds the Angular frontend and deploys it to CapRover

set -e

# Configuration
CAPROVER_NAME="aidoc-server"       # Your CapRover server name (from ~/.caprover/configs.json)
CAPROVER_APP="itiyum"              # CapRover app name for frontend
BACKEND_HOST="41.76.109.131"       # Server's public IP
BACKEND_PORT="3002"                # Backend host port (mapped to container 3001)
APP_NAME="itiyum"

echo ""
echo "🚀 Eatier/Itiyum CapRover Deployment"
echo "====================================="
echo "📍 Running on server - deploying to CapRover"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Ensure we're in the project root
if [ ! -f "angular.json" ]; then
    echo "❌ Error: angular.json not found. Please run from project root."
    exit 1
fi

# Step 2: Check if CapRover CLI is available
if ! command -v caprover &> /dev/null; then
    echo "📦 Installing CapRover CLI..."
    npm install -g caprover || { echo "❌ Failed to install caprover"; exit 1; }
fi

# Step 3: Install dependencies and build Angular
echo "📦 Installing frontend dependencies..."
npm install || { echo "❌ npm install failed"; exit 1; }

echo "🏗️  Building Angular frontend for production..."
npm run build -- --configuration=production || { echo "❌ Frontend build failed"; exit 1; }

# Step 4: Navigate to dist folder
DIST_DIR="dist/itiyum/browser"
if [ ! -d "$DIST_DIR" ]; then
    DIST_DIR="dist/itiyum"
fi
cd "$DIST_DIR" || { echo "❌ Failed to enter $DIST_DIR"; exit 1; }
echo "📂 Working in: $(pwd)"

# Step 5: Create captain-definition
echo "📝 Creating captain-definition..."
cat > captain-definition << 'EOF'
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile"
}
EOF

# Step 6: Create Dockerfile
echo "📝 Creating Dockerfile..."
cat > Dockerfile << 'EOF'
FROM nginx:stable-alpine
COPY . /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Step 7: Create nginx.conf
echo "📝 Creating nginx.conf..."
cat > nginx.conf << EOF
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html index.htm;

    # Frontend - Angular SPA
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API Proxy to backend
    location /api/ {
        proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }

    # Static file caching
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)\$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Step 8: Create deployment tarball
echo "📦 Packaging into ${APP_NAME}-frontend.tar.gz..."
tar -czf /tmp/${APP_NAME}-frontend.tar.gz ./* || { echo "❌ Failed to create tar.gz"; exit 1; }
echo "✅ Tarball created at: /tmp/${APP_NAME}-frontend.tar.gz"

# Step 9: Deploy to CapRover
echo ""
echo "🚀 Deploying to CapRover..."
caprover deploy \
  --caproverName "$CAPROVER_NAME" \
  --caproverApp "$CAPROVER_APP" \
  --tarFile /tmp/${APP_NAME}-frontend.tar.gz

# Cleanup
rm -f /tmp/${APP_NAME}-frontend.tar.gz

echo ""
echo "✅ Frontend deployment complete!"
echo "🌐 Visit: https://${CAPROVER_APP}.aidocumines.com"
echo ""
echo "📌 Make sure backend is running: ./start_backend.sh"
echo ""

