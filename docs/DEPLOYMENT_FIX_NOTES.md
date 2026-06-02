# Deployment Fix Notes
**Date:** March 26, 2026  
**Issues Fixed:** Default Avatar 404 & Messaging 400 Error

## Problems Identified

### 1. Missing Default Avatar (404 Error)
**Error in Console:**
```
GET https://itiyum.com/assets/images/default-avatar.png 404 (Not Found)
```

**Root Cause:**
- Multiple components reference `/assets/images/default-avatar.png` as a fallback avatar
- The file didn't exist in the assets directory
- Components affected:
  - `messages.component.ts`
  - `messaging-widget.component.ts`
  - `social-widget.component.ts`
  - `public-profile.component.ts`

**Solution:**
- Created `src/assets/images/default-avatar.png` using ui-avatars.com API
- File size: 3.3KB
- Background: #4ecdc4, Text: white

### 2. Messaging Request 400 Error
**Error in Console:**
```
POST https://itiyum.com/api/messaging/request 400 (Bad Request)
Error starting chat: {...}
```

**Root Cause:**
- Backend endpoint `/api/messaging/request` lacked proper validation
- No check for missing `recipientId`
- No verification that recipient user exists
- Poor error logging made debugging difficult

**Solution:**
Added validation to `backend/routes/messaging.js`:
1. Check if `recipientId` is provided (returns 400 if missing)
2. Verify recipient exists in database (returns 404 if not found)
3. Enhanced error logging with request body and user info
4. Maintained existing validations:
   - Prevent self-requests
   - Check for duplicate pending requests
   - Check for already accepted connections

## Files Changed

### 1. `backend/routes/messaging.js`
- Added `recipientId` validation
- Added recipient existence check
- Enhanced error logging

### 2. `src/assets/images/default-avatar.png` (NEW)
- Created default fallback avatar image

### 3. `quick_deploy.sh` (NEW)
- Quick deployment script for faster rebuilds
- Skips database migrations

## Deployment Instructions

### On Production Server:

```bash
cd ~/eatier

# Pull latest changes
git pull origin development-v2

# Option 1: Full deployment (RECOMMENDED - includes migrations)
./deploy_entire_project.sh

# Option 2: Quick deployment (faster, skips migrations)
./quick_deploy.sh

# Option 3: Manual backend-only rebuild
docker compose down
docker compose up --build -d
docker network connect captain-overlay-network itiyum-backend

# To check migration status:
docker exec itiyum-backend npm run migrate:status

# To manually run migrations:
docker exec itiyum-backend npm run migrate
```

### Expected Results After Deployment:

1. **Default Avatar:**
   - Users without profile photos will see a placeholder avatar
   - No more 404 errors in console for default-avatar.png

2. **Messaging Requests:**
   - Better error messages if recipientId is missing or invalid
   - 404 response if trying to message non-existent user
   - More helpful console logs for debugging
   - Actual errors (not 400 for valid requests) should be resolved

## Testing Checklist

After deployment, verify:

- [ ] Navigate to any page with user avatars
- [ ] Check browser console - no 404 errors for default-avatar.png
- [ ] Go to social widget/page
- [ ] Click "Start Chat" button on a user
- [ ] Verify chat request is sent successfully
- [ ] Check backend logs for any errors
- [ ] Test edge cases:
  - [ ] Try to chat with yourself (should get proper error)
  - [ ] Try to chat with same user twice (should get "already pending")
  - [ ] Try to chat with invalid user ID (should get "recipient not found")

## Monitoring

After deployment, monitor:
1. Browser console for any remaining errors
2. Backend logs: `docker logs -f itiyum-backend`
3. User reports of messaging issues

## Troubleshooting

### If migrations don't run:
1. Check backend logs:
   ```bash
   docker logs itiyum-backend --tail 100
   ```

2. Manually run migrations:
   ```bash
   docker exec itiyum-backend npm run migrate
   ```

3. Check migration status:
   ```bash
   docker exec itiyum-backend npm run migrate:status
   ```

4. Verify database connection:
   ```bash
   docker exec itiyum-postgres psql -U itiyum_user -d itiyum_db -c "SELECT version();"
   ```

### If frontend build fails:
1. Check Node version in Docker container
2. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

### If CapRover deployment fails:
1. Check if tarball was created: `ls -lh ~/itiyum-frontend.tar.gz`
2. Verify CapRover connection: `caprover list`
3. Check CapRover app status in web UI

## Rollback Plan

If issues occur:
```bash
cd ~/eatier
git reset --hard origin/development-v2
./deploy_entire_project.sh
```

## Additional Notes

- The default avatar uses the ui-avatars.com service pattern (same as specialist cards)
- All existing avatar fallback logic remains intact
- The messaging validation is backwards compatible
- No database changes required
- The `deploy_entire_project.sh` script should run migrations automatically via `docker exec itiyum-backend npm run migrate`

