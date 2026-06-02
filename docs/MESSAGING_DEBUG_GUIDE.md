# Messaging System Debug Guide

## 🔍 Current Issue
The messaging system is returning 500 errors when trying to:
- Load conversations
- Load chat requests
- Start a new chat

## 📋 Step-by-Step Debugging

### **Step 1: Check Backend Logs**
Run this command on your server to see the actual error:

```bash
docker logs itiyum-backend --tail 100
```

Look for error messages related to:
- Database errors (table not found, column not found)
- WebSocket errors
- SQL syntax errors

---

### **Step 2: Verify Database Tables Exist**

Connect to your database and check if the required tables exist:

```bash
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform
```

Then run these queries:

```sql
-- Check if chat_requests table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'chat_requests'
);

-- Check if chat_conversations table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'chat_conversations'
);

-- Check if chat_participants table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'chat_participants'
);

-- Check if chat_messages table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'chat_messages'
);

-- Check if user_follows table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'user_follows'
);

-- Check if user_presence table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'user_presence'
);

-- Check if pokes table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'pokes'
);
```

All should return `t` (true). If any return `f` (false), the migration hasn't been run.

---

### **Step 3: Check Table Structure**

If tables exist, verify they have the correct columns:

```sql
-- Check chat_requests structure
\d chat_requests

-- Check chat_conversations structure
\d chat_conversations

-- Check user_follows structure
\d user_follows
```

---

### **Step 4: Run Missing Migrations**

If tables don't exist, run the migrations:

```bash
# Migration 037 - Social and Messaging System
docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/037_social_and_messaging_system.sql

# Migration 038 - Presence and Enhanced Messaging
docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/038_presence_and_enhanced_messaging.sql
```

---

### **Step 5: Verify WebSocket Initialization**

Check if the backend is starting correctly:

```bash
docker logs itiyum-backend --tail 50 | grep -i "websocket\|server running"
```

You should see:
```
🚀 Server running on port 3001
🔌 WebSocket server initialized
```

---

### **Step 6: Test API Endpoints Directly**

Test the endpoints using curl to see the exact error:

```bash
# Get your auth token first (login and copy the token from browser dev tools)
TOKEN="your-jwt-token-here"

# Test get conversations
curl -H "Authorization: Bearer $TOKEN" https://itiyum.com/api/messaging/conversations

# Test get chat requests
curl -H "Authorization: Bearer $TOKEN" https://itiyum.com/api/messaging/requests?type=received

# Test send chat request
curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"recipientId":"some-user-id","message":"Hello"}' \
  https://itiyum.com/api/messaging/request
```

---

## 🔧 Common Issues and Fixes

### **Issue 1: Tables Don't Exist**
**Solution:** Run migrations 037 and 038

### **Issue 2: "column tenant_id does not exist"**
**Solution:** The migration wasn't run completely. Drop and recreate tables or run migration again.

### **Issue 3: "relation 'followers' does not exist"**
**Solution:** Already fixed in code (changed to `user_follows`). Redeploy backend.

### **Issue 4: WebSocket not initialized**
**Solution:** Check if `socket.io` is installed in backend:
```bash
docker exec itiyum-backend npm list socket.io
```

If not found:
```bash
# Already added to package.json, just rebuild
docker-compose down
docker-compose up -d --build
```

---

## 📊 Expected Database State

After running migrations, you should have these tables:

**From Migration 037:**
- `user_follows` - Social connections
- `chat_conversations` - Conversation containers
- `chat_participants` - Users in conversations
- `chat_messages` - Messages
- `chat_message_reads` - Read receipts
- `chat_requests` - Connection requests

**From Migration 038:**
- `user_presence` - Online/offline status
- `pokes` - Poke/nudge feature
- `message_files` - File attachments
- `typing_indicators` - Typing status
- `message_reactions` - Message reactions

---

## 🚀 Quick Fix Commands

If you just want to get it working quickly:

```bash
cd ~/eatier

# Pull latest code
git pull

# Run both migrations
docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/037_social_and_messaging_system.sql
docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/038_presence_and_enhanced_messaging.sql

# Rebuild and restart
./deploy_entire_project.sh
```

---

## 📝 Next Steps

1. Run Step 1 (check backend logs) and share the output
2. Run Step 2 (verify tables exist) and share results
3. Based on the results, we'll know exactly what's wrong

Please share the output of the backend logs and table existence checks!

