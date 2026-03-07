#!/usr/bin/env bash

# Commit and push the migration and import fixes

echo "📝 Committing fixes..."
echo ""

# Add the changed files
git add backend/scripts/migrations/010_industry_news_feed.sql
git add src/app/pages/business/profile/business-profile.component.ts

# Commit
git commit -m "Fix: Add blog tables to migration 010 and fix environment import path

- Added blog_categories and blog_posts table creation to migration 010
- This ensures the tables exist before trying to insert data
- Fixed environment import path from ../../../ to ../../../../
- Component is 4 levels deep: src/app/pages/business/profile/
- Fixes migration failure and production build error"

# Push to development-v2 branch
git push origin development-v2

echo ""
echo "✅ Changes committed and pushed!"
echo ""
echo "Now you can run the deployment script again on the server:"
echo "  ./latest_caprover_deployment.sh"

