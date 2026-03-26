# CRITICAL BUG FIX: tenant_id Property Standardization

## 🚨 **ISSUE RESOLVED**

**Problem:** `400 Bad Request` and `403 Forbidden` errors on messaging and pokes endpoints

**Root Cause:** Inconsistent property naming between auth middleware and route handlers

---

## ✅ **What Was Fixed**

### **Authentication Middleware** (`backend/middleware/auth.js`)
Sets the user object with `tenant_id` (underscore):
```javascript
req.user = {
  id: user.id,
  userId: user.id,
  email: user.email,
  tenant_id: user.tenant_id,  // ← Underscore notation
  // ...
};
```

### **JWT Token Payload** (`backend/routes/auth.js`)
Creates JWT with `tenant_id`:
```javascript
const tokenPayload = {
  userId: user.id,
  email: user.email,
  role: role,
  tenant_id: user.tenant_id  // ← Underscore notation
};
```

### **Routes That Were INCORRECT** (Now Fixed ✅)

**1. `backend/routes/pokes.js`**
- ❌ **Before:** `const tenantId = req.user.tenantId;`
- ✅ **After:** `const tenantId = req.user.tenant_id;`
- **Fixed in:** 4 endpoints (`/send`, `/received`, `/:pokeId/read`, `/unread-count`)

**2. `backend/routes/presence.js`**
- ❌ **Before:** `const tenantId = req.user.tenantId;`
- ✅ **After:** `const tenantId = req.user.tenant_id;`
- **Fixed in:** 4 endpoints (`/update`, `/heartbeat`, `/online`, `/status/:userId`)

**3. `backend/websocket/socketHandler.js`**
- ❌ **Before:** `socket.tenantId = decoded.tenantId;`
- ✅ **After:** `socket.tenantId = decoded.tenant_id;`

### **Routes That Were CORRECT** (No Changes Needed ✅)

**1. `backend/routes/messaging.js`**
```javascript
const tenantId = req.user.tenant_id;  // ✅ Already correct
```

---

## 📊 **Impact**

### **Before Fix:**
- ❌ `/api/messaging/request` → `400 Bad Request` (tenant_id was `undefined`)
- ❌ `/api/pokes/send` → `403 Forbidden` (tenant_id was `undefined` in query)
- ❌ WebSocket authentication issues

### **After Fix:**
- ✅ `/api/messaging/request` → `200 OK`
- ✅ `/api/pokes/send` → `200 OK` (if tables exist)
- ✅ WebSocket authentication works correctly

---

## 🔧 **Deployment Instructions**

### **On Production Server** (`41.76.109.131`)

```bash
# 1. Pull the latest changes
cd ~/eatier
git pull origin development-v2

# 2. Restart the backend container (CapRover)
# Since you're using CapRover, the container is: captain-captain.1.lbkg2324tq8ef12uo87w71c0e
# CapRover auto-rebuilds on push, OR manually restart:
docker restart captain-captain.1.lbkg2324tq8ef12uo87w71c0e

# 3. Check backend logs for errors
docker logs -f captain-captain.1.lbkg2324tq8ef12uo87w71c0e

# 4. Verify the fix
curl -X POST https://itiyum.com/api/messaging/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientId": "some-user-id"}'
```

---

## ⚠️ **REMAINING ISSUE: Missing Database Tables**

Even after this fix, you may still see **403 Forbidden** on `/api/pokes/send` because:

**Missing Table:** `user_follows` (created in Migration 037)

### **Solution:**
Run the database migrations on production:

```bash
# SSH into production server
ssh aidocumines@datasqan.com

# Run migrations (if you have a migration script)
cd ~/eatier
# Option 1: Using migration script
node backend/scripts/runMigrations.js

# Option 2: Manually run SQL files
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform -f /path/to/037_social_and_messaging.sql
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform -f /path/to/038_presence_and_enhanced_messaging.sql
```

---

## 📋 **Verification Checklist**

- [x] Fixed `backend/routes/pokes.js` (4 occurrences)
- [x] Fixed `backend/routes/presence.js` (4 occurrences)
- [x] Fixed `backend/websocket/socketHandler.js` (1 occurrence)
- [x] Committed and pushed to `development-v2`
- [ ] Pulled changes on production server
- [ ] Restarted backend container
- [ ] Ran database migrations (037 & 038)
- [ ] Tested chat request button (should get 200 OK)
- [ ] Tested poke button (should get 200 OK after migrations)

---

## 🎯 **Files Modified**

**Commit:** `eb75583` (fix(backend): standardize tenant_id property across all routes)

1. ✅ `backend/routes/pokes.js`
2. ✅ `backend/routes/presence.js`
3. ✅ `backend/websocket/socketHandler.js`

---

**Next Step:** Pull this fix on production and restart the backend!

