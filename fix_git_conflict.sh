#!/usr/bin/env bash

# Fix git conflict on server

echo "=========================================="
echo "🔧 FIX GIT CONFLICT"
echo "=========================================="
echo ""

echo "Step 1: Backup existing deployment script"
cd ~/eatier
cp latest_caprover_deployment.sh latest_caprover_deployment.sh.backup
echo "✅ Backed up to latest_caprover_deployment.sh.backup"

echo ""
echo "Step 2: Remove the conflicting file"
rm latest_caprover_deployment.sh
echo "✅ Removed latest_caprover_deployment.sh"

echo ""
echo "Step 3: Pull latest changes"
git pull origin development-v2
echo "✅ Pulled latest changes"

echo ""
echo "Step 4: Make deployment script executable"
chmod +x latest_caprover_deployment.sh
echo "✅ Made script executable"

echo ""
echo "Step 5: Show what changed"
echo "Comparing old vs new deployment script:"
diff latest_caprover_deployment.sh.backup latest_caprover_deployment.sh || echo "Files are different"

echo ""
echo "=========================================="
echo "✅ READY TO DEPLOY"
echo "=========================================="
echo "Run: ./latest_caprover_deployment.sh"

