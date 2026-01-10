#!/usr/bin/env bash

# Eatier/Itiyum CapRover Deployment Script
# This builds the Angular frontend and deploys it to CapRover
# The backend runs separately via docker-compose on the server

set -e

# Configuration - Update these for your setup
CAPROVER_NAME="aidoc-server"      # Your CapRover server name (from ~/.caprover/configs.json)
CAPROVER_APP="itiyum"              # CapRover app name for frontend
BACKEND_HOST="41.76.109.131"       # Server's public IP (accessible from Docker containers)
BACKEND_PORT="3001"                # Backend port on host
APP_NAME="itiyum"                  # Application name

echo ""
echo "🚀 Eatier/Itiyum CapRover Deployment"
echo "====================================="
echo ""

# Step 1: Ensure we're in the project root
if [ ! -f "angular.json" ]; then
    echo "❌ Error: angular.json not found. Please run this script from the project root."
    exit 1
fi

# Step 2: Install dependencies and build Angular project
echo "📦 Installing dependencies..."
npm install || { echo "❌ npm install failed"; exit 1; }

echo "🏗️  Building Angular frontend for production..."
npm run build -- --configuration=production || { echo "❌ Frontend build failed"; exit 1; }

# Step 3: Navigate to dist folder
DIST_DIR="dist/itiyum/browser"
if [ ! -d "$DIST_DIR" ]; then
    # Try alternate Angular 17+ output path
    DIST_DIR="dist/itiyum"
fi

cd "$DIST_DIR" || { echo "❌ Failed to enter $DIST_DIR"; exit 1; }

echo "📂 Working in: $(pwd)"

# Step 4: Write captain-definition
echo "📝 Creating captain-definition..."
cat <<EOF > captain-definition
{
  "schemaVersion": 2,
  "dockerfilePath": "./Dockerfile"
}
EOF

# Step 5: Write Dockerfile for nginx
echo "📝 Creating Dockerfile..."
cat <<EOF > Dockerfile
FROM nginx:stable-alpine
COPY . /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Step 6: Write nginx.conf with API proxy
echo "📝 Creating nginx.conf..."
cat <<'NGINXEOF' > nginx.conf
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html index.htm;

    # Frontend - Angular SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API Proxy to backend
    location /api/ {
        proxy_pass http://BACKEND_HOST_PLACEHOLDER:BACKEND_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # WebSocket support for real-time features
    location /socket.io/ {
        proxy_pass http://BACKEND_HOST_PLACEHOLDER:BACKEND_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Static file caching
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {
        expires 6M;
        access_log off;
        add_header Cache-Control "public";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
NGINXEOF

# Replace placeholders with actual values
sed -i.bak "s/BACKEND_HOST_PLACEHOLDER/${BACKEND_HOST}/g" nginx.conf
sed -i.bak "s/BACKEND_PORT_PLACEHOLDER/${BACKEND_PORT}/g" nginx.conf
rm -f nginx.conf.bak

# Step 7: Create deployment tarball
echo "📦 Packaging into ${APP_NAME}-frontend.tar.gz..."
tar -czf ~/${APP_NAME}-frontend.tar.gz ./* || { echo "❌ Failed to create tar.gz"; exit 1; }

echo "✅ Tarball created at: ~/${APP_NAME}-frontend.tar.gz"
echo ""

# Step 8: Deploy to CapRover
echo "🚀 Deploying to CapRover..."
caprover deploy \
  --caproverName "$CAPROVER_NAME" \
  --caproverApp "$CAPROVER_APP" \
  --tarFile ~/${APP_NAME}-frontend.tar.gz

echo ""
echo "✅ Frontend deployment complete!"
echo "🌐 Visit: https://${CAPROVER_APP}.aidocumines.com"
echo ""
echo "📌 Remember: Backend should be running on ${BACKEND_HOST}:${BACKEND_PORT}"
echo "   Start it with: ./deploy_backend.sh"
echo ""

