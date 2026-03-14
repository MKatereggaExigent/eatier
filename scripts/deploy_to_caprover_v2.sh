#!/usr/bin/env bash

# Simple CapRover deployment script
# This ONLY builds and deploys the frontend to CapRover
# Backend should already be running via docker-compose

set -e

# Configuration
CAPROVER_NAME="aidoc-server"
CAPROVER_APP="itiyum"
BACKEND_HOST="41.76.109.131"
BACKEND_PORT="3002"

echo ""
echo "🚀 Itiyum CapRover Frontend Deployment"
echo "======================================"
echo ""

# Get to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Step 1: Build Angular frontend (should already be built, but just in case)
if [ ! -d "dist/itiyum/browser" ]; then
    echo "📦 Building Angular frontend..."
    npm run build || { echo "❌ Build failed"; exit 1; }
fi

# Step 2: Navigate to dist folder
DIST_DIR="dist/itiyum/browser"
cd "$DIST_DIR" || { echo "❌ Failed to enter $DIST_DIR"; exit 1; }

# Step 3: Create Dockerfile
echo "📝 Creating Dockerfile..."
cat > Dockerfile << 'EOF'
FROM nginx:stable-alpine
COPY . /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Step 4: Create nginx.conf with API proxy
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

# Step 5: Create deployment tarball
echo "📦 Creating tarball..."
tar -czf ~/itiyum-frontend.tar.gz ./* || { echo "❌ Failed to create tar.gz"; exit 1; }
echo "✅ Tarball created at: ~/itiyum-frontend.tar.gz"

# Step 6: Deploy to CapRover
echo ""
echo "🚀 Deploying to CapRover..."
caprover deploy --caproverName "$CAPROVER_NAME" --caproverApp "$CAPROVER_APP" --tarFile ~/itiyum-frontend.tar.gz

echo ""
echo "✅ Frontend deployment complete!"
echo "🌐 Visit: https://itiyum.com"
echo ""
