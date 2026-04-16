# 🔔 Notification Testing Scripts

Scripts to seed and manage test notifications for all user accounts.

## 📁 Available Scripts

### 1. Docker Version (Recommended for Production Testing)

**Seed Test Notifications:**
```bash
./scripts/seed_notifications_docker.sh
```

**Cleanup Test Notifications:**
```bash
./scripts/cleanup_notifications_docker.sh
```

### 2. Direct Database Version (For Local Development)

**Seed Test Notifications:**
```bash
./scripts/seed_test_notifications.sh
```

**Cleanup Test Notifications:**
```bash
./scripts/cleanup_test_notifications.sh
```

---

## 🎯 What These Scripts Do

### Seed Script Creates:
- **3-5 notifications per active user**
- **Multiple notification types:**
  - 📅 New Booking
  - ⭐ New Review
  - 💬 New Message
  - 💰 Payment Received
  - 👥 New Follower
  - ✅ Booking Confirmed
  - And more...

- **Realistic timestamps** (randomized from minutes to days ago)
- **Mixed read/unread status** (for testing mark-as-read functionality)
- **Role-specific action URLs** (links to correct dashboard)
- **User-specific data** (filtered by user_id and tenant_id)

### All Test Notifications Are:
- Prefixed with `[TEST]` for easy identification
- Properly filtered by user and tenant
- Safe to delete without affecting real data

---

## 🧪 How to Test Notifications

### Step 1: Seed Test Data
```bash
./scripts/seed_notifications_docker.sh
```

You should see output like:
```
🔔 Seeding Test Notifications via Docker
==========================================
NOTICE: Creating notifications for: test-user@itiyum.com (John Doe) - Role: user
NOTICE: Creating notifications for: business@itiyum.com (Jane Smith) - Role: business_owner
...
✅ Created 47 test notifications
```

### Step 2: Test with Different Users

**Login as different account types:**

1. **Normal User** (`/dashboard/user`)
   - Should see their own notifications only
   - Notification bell in sidebar
   - Click to see dropdown

2. **Business Owner** (`/dashboard/business`)
   - Should see business-specific notifications
   - Different action URLs than normal users
   - Payment and booking notifications

3. **Specialist** (`/dashboard/specialist`)
   - Should see specialist-relevant notifications
   - Booking confirmations
   - Review notifications

4. **Food Enthusiast** (`/dashboard/food-enthusiast`)
   - Should see social notifications
   - Follower notifications
   - Message notifications

### Step 3: Verify Privacy

**Critical Test - User Isolation:**
1. Login as User A
2. Note the notifications shown
3. Login as User B
4. Should see COMPLETELY DIFFERENT notifications
5. No overlap between users

**Expected Result:** ✅ Each user sees ONLY their own notifications

### Step 4: Test Functionality

**Mark as Read:**
- Click the ✓ button on an unread notification
- Notification should update immediately
- Unread count should decrease

**Delete Notification:**
- Click the 🗑️ button
- Notification should disappear
- Should be removed from database

**Navigate to Action:**
- Click on a notification
- Should navigate to the correct page
- Should mark as read automatically

### Step 5: Test Refresh Behavior

**Before Fix (Broken):**
- ❌ Same 13 hardcoded notifications
- ❌ Appeared after every refresh
- ❌ All users saw same notifications

**After Fix (Working):**
- ✅ User-specific notifications from database
- ✅ Persist across refreshes
- ✅ Each user sees only their own

**To Test:**
1. Login and view notifications
2. Press `Cmd+Shift+R` (hard refresh)
3. Should see SAME notifications (not hardcoded ones)
4. Should NOT see 13 generic notifications

---

## 🗑️ Cleanup

When you're done testing, clean up the test data:

```bash
./scripts/cleanup_notifications_docker.sh
```

Output:
```
🗑️  Cleaning up Test Notifications
===================================
Before cleanup:
 test_notifications 
--------------------
                 47

After cleanup:
 remaining_test_notifications 
------------------------------
                            0

✅ Test notifications cleaned up!
```

---

## 📊 Database Queries

### View All Test Notifications
```sql
SELECT 
    u.email,
    u.role,
    n.title,
    n.message,
    n.is_read,
    n.created_at
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.message LIKE '%[TEST]%'
ORDER BY u.email, n.created_at DESC;
```

### Count by User
```sql
SELECT 
    u.email,
    u.role,
    COUNT(*) as total_notifications,
    SUM(CASE WHEN n.is_read = false THEN 1 ELSE 0 END) as unread_count
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.message LIKE '%[TEST]%'
GROUP BY u.email, u.role
ORDER BY u.role, u.email;
```

---

## ✅ Expected Results

After running the seed script, you should be able to:

1. ✅ Login as any user and see 3-5 test notifications
2. ✅ Each user sees ONLY their own notifications
3. ✅ Notifications have realistic icons and messages
4. ✅ Some are read, some unread
5. ✅ Clicking notifications navigates to correct pages
6. ✅ Mark as read/unread works
7. ✅ Delete notification works
8. ✅ Refresh maintains state (no hardcoded data)
9. ✅ Unread count badge updates correctly
10. ✅ No cross-user notification leakage

---

## 🐛 Troubleshooting

**No notifications appearing?**
- Check that users exist in database
- Verify Docker container is running
- Check browser console for errors

**All users seeing same notifications?**
- This was the original bug - should be fixed
- Verify backend is using `req.user.userId` not `req.user.id`
- Check API response includes `user_id` filter

**Notifications not persisting?**
- Check database connection
- Verify migrations have run
- Check `notifications` table exists

---

## 🎯 Testing Checklist

- [ ] Run seed script successfully
- [ ] Login as User A - see notifications
- [ ] Login as User B - see DIFFERENT notifications
- [ ] Mark notification as read - updates correctly
- [ ] Delete notification - removes from list
- [ ] Click notification - navigates to correct page
- [ ] Refresh page - same notifications appear (not hardcoded)
- [ ] Unread count badge shows correct number
- [ ] Run cleanup script - removes all [TEST] notifications

**If all checkboxes pass: ✅ Notification system is working correctly!**
