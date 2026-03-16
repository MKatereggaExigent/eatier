# YouTube Link Update

## ✅ Changes Made

### **1. Help Centre Page**
- **File**: `src/app/pages/help-centre/help-centre.component.html`
- **Line**: 219
- **Old URL**: `https://youtube.com/itiyum`
- **New URL**: `https://www.youtube.com/@Itiyum`
- **Status**: ✅ Updated

---

## 📋 YouTube Link Locations in Codebase

### **Frontend Code**
1. ✅ **Help Centre** - Video Tutorials link (UPDATED)
   - Path: `src/app/pages/help-centre/help-centre.component.html:219`
   - URL: `https://www.youtube.com/@Itiyum`

2. ℹ️ **User Model** - Food Enthusiast Profile
   - Path: `src/app/shared/models/user.model.ts:110`
   - Field: `enthusiastProfile.socialMedia.youtube`
   - Note: This is for user-provided YouTube channels (not Itiyum's channel)

---

## 🗄️ Database Records to Update

If there are any existing user accounts in the database that have YouTube links in their profiles, you may want to check and update them. Here's a SQL query to check:

```sql
-- Check for any users with YouTube links in their profiles
SELECT 
    id, 
    first_name, 
    last_name, 
    email,
    profile_data->'enthusiastProfile'->'socialMedia'->>'youtube' as youtube_link
FROM users
WHERE profile_data->'enthusiastProfile'->'socialMedia'->>'youtube' IS NOT NULL
    AND profile_data->'enthusiastProfile'->'socialMedia'->>'youtube' LIKE '%youtube%';
```

If you find any Itiyum official accounts with the old YouTube URL, update them with:

```sql
-- Update specific user's YouTube link (replace USER_ID with actual ID)
UPDATE users
SET profile_data = jsonb_set(
    profile_data,
    '{enthusiastProfile,socialMedia,youtube}',
    '"https://www.youtube.com/@Itiyum"'
)
WHERE id = 'USER_ID';
```

---

## 🚀 Deployment

To deploy this change:

```bash
cd ~/eatier
git pull
./deploy_entire_project.sh
```

---

## 📝 Notes

- The correct Itiyum YouTube channel URL is: **`https://www.youtube.com/@Itiyum`**
- All future references to Itiyum's YouTube channel should use this URL
- User-provided YouTube links in profiles are separate and should not be changed
- The change has been committed and pushed to the `development-v2` branch

---

## ✅ Verification

After deployment, verify the change by:
1. Navigate to the Help Centre page (`/help`)
2. Scroll to the "Additional Resources" section
3. Click on the "Video Tutorials" card
4. Verify it opens `https://www.youtube.com/@Itiyum` in a new tab

