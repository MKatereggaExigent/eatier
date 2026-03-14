#!/usr/bin/env bash

# ============================================
# ITIYUM COMPLETE DEPLOYMENT SCRIPT
# ============================================
# This script does EVERYTHING needed to deploy:
# 1. Pull latest code from git
# 2. Start backend with Docker Compose
# 3. Run database migrations
# 4. Build Angular frontend
# 5. Deploy frontend to CapRover
# ============================================

set -e  # Exit on any error

# Configuration
CAPROVER_NAME="aidoc-server"
CAPROVER_APP="itiyum"
BACKEND_HOST="41.76.109.131"
BACKEND_PORT="3002"

echo ""
echo "=========================================="
echo "   🚀 ITIYUM COMPLETE DEPLOYMENT"
echo "=========================================="
echo "📍 Server: $(hostname)"
echo "📅 $(date)"
echo ""

# ============================================
# STEP 1: Pull latest code
# ============================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📥 STEP 1: Pulling latest code"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
git pull origin development-v2

# ============================================
# STEP 2: Start Backend with Docker Compose
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🐳 STEP 2: Starting Backend Services"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Stop and remove any existing containers (including orphans)
echo "🛑 Stopping existing containers..."
docker compose down --remove-orphans 2>/dev/null || true

# Build and start backend
echo "🐳 Building and starting backend..."
docker compose up --build -d

# ============================================
# STEP 3: Wait for PostgreSQL
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ STEP 3: Waiting for PostgreSQL..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
sleep 10

for i in {1..30}; do
    if docker exec itiyum-postgres pg_isready -U itiyum_user > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  PostgreSQL timeout. Continuing anyway..."
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

# ============================================
# STEP 4: Run Database Migrations
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🗄️  STEP 4: Running database migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-backend npm run migrate

# ============================================
# STEP 5: Build Angular Frontend
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏗️  STEP 5: Building Angular frontend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build

# ============================================
# STEP 6: Prepare CapRover Deployment
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📦 STEP 6: Preparing CapRover deployment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Navigate to dist folder
DIST_DIR="dist/itiyum/browser"
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Error: $DIST_DIR not found!"
    exit 1
fi

cd "$DIST_DIR"

# Create Dockerfile
echo "📝 Creating Dockerfile..."
cat > Dockerfile << 'EOF'
FROM nginx:stable-alpine
COPY . /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
EOF

# Create nginx.conf with API proxy
echo "📝 Creating nginx.conf..."
cat > nginx.conf << EOF
server {
    listen 80;
    server_name localhost;

    root /usr/share/nginx/html;
    index index.html index.htm;

    # Frontend - Angular SPA
    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }

    # API Proxy to backend
    location /api/ {
        proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://${BACKEND_HOST}:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
    }

    # Static file caching
    location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)\\\$ {
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


# Create deployment tarball
echo "📦 Creating deployment tarball..."
tar -czf ~/itiyum-frontend.tar.gz ./* || { echo "❌ Failed to create tarball"; exit 1; }
echo "✅ Tarball created: ~/itiyum-frontend.tar.gz"

# ============================================
# STEP 7: Deploy to CapRover
# ============================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 STEP 7: Deploying to CapRover"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if CapRover is configured
if [ ! -f ~/.caprover/configs.json ]; then
    echo ""
    echo "❌ CapRover not configured. Please run:"
    echo "   caprover login"
    echo ""
    exit 1
fi

# Deploy to CapRover
caprover deploy \
  --caproverName "$CAPROVER_NAME" \
  --caproverApp "$CAPROVER_APP" \
  --tarFile ~/itiyum-frontend.tar.gz

# Cleanup
rm -f ~/itiyum-frontend.tar.gz

# ============================================
# DEPLOYMENT COMPLETE!
# ============================================
echo ""
echo "=========================================="
echo "   ✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Frontend: https://itiyum.com"
echo "🔧 Backend:  https://itiyum.com/api"
echo ""
echo "📊 Check status:"
echo "   docker compose ps"
echo "   docker logs itiyum-backend --tail 50"
echo ""
echo "🧪 Test the API:"
echo "   curl https://itiyum.com/api/auth/status"
echo ""
