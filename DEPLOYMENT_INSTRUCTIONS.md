# 🚀 Social & Messaging Fixes - Deployment Instructions

## ✅ What Was Fixed

All frontend issues have been resolved:
- ✅ Avatar display (no more black squares)
- ✅ Start Chat buttons added to all user cards
- ✅ Activity Feed pagination (top 10)
- ✅ Discover pagination
- ✅ Back navigation from Messages
- ✅ Start New Chat button in Messages
- ✅ Improved error handling

---

## ⚠️ CRITICAL: Database Migration Required

The 400 error on `/api/messaging/request` is because the database tables don't exist yet.

**Console Error:**
```
/api/messaging/request:1  Failed to load resource: the server responded with a status of 400 ()
Error starting chat: M
```

**Required Tables:**
- `chat_requests`
- `chat_conversations`
- `chat_participants`
- `chat_messages`
- `user_follows`

---

## 🎯 Quick Deployment (Recommended)

SSH into your production server and run:

```bash
cd ~/eatier

# Make the deployment script executable
chmod +x scripts/deploy_social_messaging_fixes.sh

# Run the automated deployment
./scripts/deploy_social_messaging_fixes.sh
```

This script will:
1. ✅ Check you're on the production server
2. ✅ Run database migrations (037 & 038)
3. ✅ Verify all tables were created
4. ✅ Restart the backend container
5. ✅ Build and deploy the frontend
6. ✅ Verify no errors in logs

---

## 📋 Manual Deployment (Alternative)

If you prefer to run each step manually:

### **Step 1: Run Database Migrations**

```bash
cd ~/eatier

# Run all migrations
./run_all_migrations.sh --docker
```

### **Step 2: Verify Tables Exist**

```bash
# Check tables
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt chat_requests"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt chat_conversations"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\dt user_follows"

# Or use the check script
chmod +x scripts/check_messaging_tables.sh
./scripts/check_messaging_tables.sh
```

### **Step 3: Restart Backend**

```bash
docker restart itiyum-backend
```

### **Step 4: Deploy Frontend**

```bash
npm run build
./scripts/deploy_to_caprover_v2.sh
```

---

## 🔍 Troubleshooting

### **If you still see 400 errors after deployment:**

1. **Check if migrations ran successfully:**
   ```bash
   docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "SELECT version, name, applied_at FROM schema_migrations WHERE version IN ('037', '038') ORDER BY version;"
   ```

2. **Check backend logs:**
   ```bash
   docker logs itiyum-backend --tail=100 | grep -i "error\|chat\|messaging"
   ```

3. **Manually run migrations:**
   ```bash
   docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/037_social_and_messaging_system.sql
   docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/038_presence_and_enhanced_messaging.sql
   ```

4. **Restart backend again:**
   ```bash
   docker restart itiyum-backend
   ```

---

## ✅ Verification

After deployment, test the following:

1. **Go to:** https://itiyum.com/dashboard/specialist/social
2. **Check:** Avatars display properly (no black squares)
3. **Click:** "💬 Chat" button on any user card
4. **Verify:** No 400 error in console
5. **Check:** You're redirected to /messages
6. **Verify:** Chat request appears in the Messages page

---

## 📊 Container Names Reference

**Correct container names on production:**
- Database: `itiyum-postgres`
- Backend: `itiyum-backend`
- Frontend: `itiyum-frontend`

**NOT:**
- ~~eatier-postgres~~
- ~~eatier-backend~~
- ~~eatier-frontend~~

---

## 📁 Files Modified

1. `src/app/pages/specialist/social/specialist-social.component.ts`
2. `src/app/pages/specialist/social/specialist-social.component.html`
3. `src/app/pages/specialist/social/specialist-social.component.scss`
4. `src/app/pages/messages/messages.component.ts`
5. `src/app/pages/messages/messages.component.html`
6. `src/app/pages/messages/messages.component.scss`
7. `scripts/check_messaging_tables.sh` (new)
8. `scripts/deploy_social_messaging_fixes.sh` (new)
9. `SOCIAL_MESSAGING_FIXES.md` (updated)
10. `DEPLOYMENT_INSTRUCTIONS.md` (new)

---

## 🎉 Success Criteria

After successful deployment, you should see:
- ✅ No black squares on avatars
- ✅ Chat buttons on all user cards
- ✅ No 400 errors when clicking Chat
- ✅ Successful navigation to Messages page
- ✅ Chat requests appear in Messages

---

**Need help? Check the logs or run the troubleshooting steps above!**

