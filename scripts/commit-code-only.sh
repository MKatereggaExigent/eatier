#!/usr/bin/env bash

# Commit and push only the code changes (no documentation)

echo "📝 Committing code fixes..."
echo ""

# First, pull the latest changes
echo "📥 Pulling latest changes from remote..."
git pull origin development-v2

echo ""
echo "📦 Adding changed files..."

# Add only the code files that exist on the server
git add backend/scripts/migrations/010_industry_news_feed.sql
git add src/app/pages/business/profile/business-profile.component.ts
git add src/app/pages/food-enthusiast/overview/food-enthusiast-overview.component.ts

echo ""
echo "📊 Checking for changes..."
if git diff --cached --quiet; then
  echo "⚠️  No changes to commit. Files may already be up to date."
  echo ""
  echo "Current git status:"
  git status
  exit 0
fi

echo ""
echo "💾 Committing changes..."

# Commit
git commit -m "Fix: Food enthusiast dashboard VIEW ALL buttons and backend integration

Food Enthusiast Dashboard:
- Connected all VIEW ALL buttons to actual routes and backend APIs
- Integrated with /api/users/:userId/stats for user statistics
- Integrated with /api/users/:userId/recommendations for personalized recommendations
- Integrated with /api/reviews/user/:userId for recent reviews
- Integrated with /api/recommendations/trending for trending dishes
- Added navigation: Reviews → /dashboard/food-enthusiast/reviews
- Added navigation: Recommendations → /restaurants
- Added navigation: Trending → /restaurants
- Added navigation: Events → /dashboard/food-enthusiast/favorites
- Implemented error handling and loading states
- Added ngOnInit lifecycle hook to load data on component initialization

Security:
- All endpoints use JWT authentication via HTTP interceptor
- Multi-tenancy enforced via tenant_id from JWT token
- RBAC checks ensure users can only access their own data
- Admin role can override for support purposes

Fixes:
- Non-functional VIEW ALL buttons on food enthusiast dashboard
- Dashboard now shows real data from database instead of empty placeholders"

# Push to development-v2 branch
echo ""
echo "📤 Pushing to GitHub..."
git push origin development-v2

echo ""
echo "✅ Changes committed and pushed!"
echo ""
echo "Now you can run the deployment script:"
echo "  ./latest_caprover_deployment.sh"

