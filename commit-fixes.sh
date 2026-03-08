#!/usr/bin/env bash

# Commit and push all fixes

echo "📝 Committing fixes..."
echo ""

# Add the changed files
git add backend/scripts/migrations/010_industry_news_feed.sql
git add src/app/pages/business/profile/business-profile.component.ts
git add src/app/pages/food-enthusiast/overview/food-enthusiast-overview.component.ts
git add FOOD_ENTHUSIAST_VIEW_ALL_FIX.md
git add FOOD_ENTHUSIAST_SECURITY_AUDIT.md

# Commit
git commit -m "Fix: Migration, import path, and food enthusiast VIEW ALL buttons

Backend/Build Fixes:
- Added blog_categories and blog_posts table creation to migration 010
- Fixed environment import path from ../../../ to ../../../../ in business-profile
- Component is 4 levels deep: src/app/pages/business/profile/

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

Fixes:
- Migration failure (blog tables not existing)
- Production build error (wrong import path)
- Non-functional VIEW ALL buttons on food enthusiast dashboard"

# Push to development-v2 branch
git push origin development-v2

echo ""
echo "✅ Changes committed and pushed!"
echo ""
echo "Now you can run the deployment script again on the server:"
echo "  ./latest_caprover_deployment.sh"

