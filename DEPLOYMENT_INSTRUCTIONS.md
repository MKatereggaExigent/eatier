# Deployment Fix Instructions

## Issues Fixed

### 1. Database Migration Error
**Problem:** Migration `010_industry_news_feed.sql` was trying to insert into `blog_categories` table that didn't exist.

**Solution:** Added the blog tables creation (blog_categories, blog_posts, blog_post_likes) directly into migration 010 before trying to insert data.

### 2. Frontend Build Error
**Problem:** Wrong relative path to environment file in `business-profile.component.ts` causing production build to fail with "Could not resolve" error.

**Solution:** Fixed the import path from `../../../environments/environment` to `../../../../environments/environment` (component is 4 levels deep in the directory structure).

## Files Changed

1. `backend/scripts/migrations/010_industry_news_feed.sql`
   - Added CREATE TABLE statements for blog_categories, blog_posts, and blog_post_likes
   - Added indexes for the blog tables
   - Now creates tables before inserting data

2. `src/app/pages/business/profile/business-profile.component.ts`
   - Removed duplicate environment import

## Steps to Deploy

### On Your Local Machine (datasqan.com server):

1. **Commit and push the changes:**
   ```bash
   chmod +x commit-fixes.sh
   ./commit-fixes.sh
   ```

2. **Run the deployment script again:**
   ```bash
   ./latest_caprover_deployment.sh
   ```

The deployment should now:
- ✅ Pull the latest code with fixes
- ✅ Run migrations successfully (migration 010 will create the blog tables)
- ✅ Build the frontend successfully (no duplicate import error)
- ✅ Deploy to CapRover

## What Was Fixed

### Migration 010 Now Includes:
```sql
-- Creates blog_categories table
CREATE TABLE IF NOT EXISTS blog_categories (...)

-- Creates blog_posts table  
CREATE TABLE IF NOT EXISTS blog_posts (...)

-- Creates blog_post_likes table
CREATE TABLE IF NOT EXISTS blog_post_likes (...)

-- Then inserts the category data
INSERT INTO blog_categories ...
```

### Business Profile Component:
```typescript
// Before (WRONG PATH - 3 levels up):
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';  // ❌ WRONG

// After (CORRECT PATH - 4 levels up):
import { AuthService } from '../../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';  // ✅ CORRECT

// Why 4 levels?
// Component location: src/app/pages/business/profile/business-profile.component.ts
// Environment location: src/environments/environment.ts
// Path: profile/ -> business/ -> pages/ -> app/ -> src/
//       ../       -> ../../   -> ../../../ -> ../../../../
```

## Verification

After deployment completes, verify:

1. **Database migrations:** All 28 migrations should be applied
2. **Frontend build:** Should complete without errors
3. **Application:** Should be accessible at https://itiyum.aidocumines.com

