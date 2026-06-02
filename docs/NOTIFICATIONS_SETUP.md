# 🔔 Notification System Setup & Testing Guide

## 📋 Overview

The notification system in this application has **real backend endpoints** (not dummy data). It fetches notifications from the database via the `/api/notifications` endpoint.

### Current Status

✅ **Backend API Endpoints** - Fully implemented
✅ **Database Schema** - `notifications` table exists
✅ **Frontend Integration** - Connected to API
⚠️ **Sample Data** - May be empty for some/all accounts

---

## 🏗️ Architecture

### Backend Components

**API Endpoints** (`backend/routes/notifications.js`):
- `GET /api/notifications` - Fetch user's notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete a notification

**Database Table** (`notifications`):
```sql
- id (UUID)
- tenant_id (UUID) - Multi-tenancy support
- user_id (UUID) - Notification recipient
- type (TEXT) - booking, review, message, success, warning, error, info
- title (TEXT) - Notification title
- message (TEXT) - Notification content
- is_read (BOOLEAN) - Read status
- read_at (TIMESTAMP) - When marked as read
- created_at (TIMESTAMP) - When created
- data (JSONB) - Additional metadata (e.g., action_url)
```

### Frontend Components

**Service** (`src/app/core/services/notification.service.ts`):
- Fetches notifications from API
- Falls back to mock data if API fails
- Manages read/unread state
- Provides real-time updates

**UI Component** (`src/app/core/layout.component.html`):
- Bell icon in header with unread count badge
- Dropdown panel showing notifications
- Mark as read / Delete actions
- Click to navigate to action URL

---

## 🚀 Setup Instructions

### Step 1: Verify Database Schema

Check if the `notifications` table exists:

```bash
# For Docker setup
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "\d notifications"

# For local setup
psql -U itiyum_user -d itiyum_platform -c "\d notifications"
```

If the table doesn't exist, run migrations:

```bash
./run_all_migrations.sh --docker
```

### Step 2: Seed Sample Notifications

**Option A: Using the Seed Script (Recommended)**

```bash
# For Docker setup
docker exec itiyum-backend node scripts/seed_notifications.js

# For local setup
cd backend
node scripts/seed_notifications.js
```

This will create 6 sample notifications for each user account.

**Option B: Manual SQL Insert (Quick Test)**

```bash
# Connect to database
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform

# Insert sample notifications (replace USER_ID and TENANT_ID)
INSERT INTO notifications (tenant_id, user_id, type, title, message, is_read, data) VALUES
((SELECT tenant_id FROM users LIMIT 1), 'YOUR_USER_ID', 'booking', 'Booking Confirmed', 'Your reservation is confirmed for tomorrow at 7 PM', false, '{"action_url": "/dashboard/bookings"}'),
((SELECT tenant_id FROM users LIMIT 1), 'YOUR_USER_ID', 'review', 'New Review', 'Someone left a 5-star review!', false, '{"action_url": "/dashboard/reviews"}'),
((SELECT tenant_id FROM users LIMIT 1), 'YOUR_USER_ID', 'message', 'New Message', 'You have a new message', false, '{"action_url": "/messages"}');
```

### Step 3: Test All Account Types

The application has 4 account types. Test notifications for each:

#### 1️⃣ Regular User Account
- Login with a regular user account
- Click the bell icon (top right)
- Should see notifications related to bookings, payments, messages

#### 2️⃣ Business Owner Account
- Login with a business owner account
- Should see notifications for reviews, bookings, inquiries

#### 3️⃣ Specialist Account
- Login with a specialist account
- Should see notifications for appointments, client messages, reviews

#### 4️⃣ Admin Account
- Login with an admin account
- Should see system notifications, user reports, etc.

---

## 🧪 Testing Checklist

### ✅ Functional Tests

- [ ] **Fetch Notifications**: Bell icon shows correct unread count
- [ ] **Display**: Clicking bell shows notifications panel
- [ ] **Mark as Read**: Clicking "✓" marks individual notification as read
- [ ] **Mark All Read**: "Mark all read" button works
- [ ] **Delete**: Delete button (🗑️) removes notification
- [ ] **Navigation**: Clicking notification navigates to action URL
- [ ] **Empty State**: Shows "No notifications" when empty
- [ ] **Time Display**: Shows relative time ("2h ago", "1d ago")

### ✅ Account Type Tests

- [ ] **Regular User**: Can see booking/payment notifications
- [ ] **Business Owner**: Can see review/inquiry notifications
- [ ] **Specialist**: Can see appointment notifications
- [ ] **Admin**: Can see system notifications

### ✅ API Tests

Test the endpoints directly:

```bash
# Get JWT token first (login)
TOKEN="your_jwt_token_here"

# Fetch notifications
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/notifications

# Mark as read
curl -X PATCH -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/notifications/NOTIFICATION_ID/read

# Delete notification
curl -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/notifications/NOTIFICATION_ID
```

---

## 🔍 Troubleshooting

### Problem: No notifications showing

**Diagnosis:**
1. Check browser console for API errors
2. Check if user is logged in
3. Verify notifications exist in database:
   ```sql
   SELECT * FROM notifications WHERE user_id = 'YOUR_USER_ID' LIMIT 5;
   ```

**Solution:**
- Run the seed script to create sample notifications
- Or manually insert notifications (see Step 2, Option B)

### Problem: Shows mock data instead of real data

**Diagnosis:**
- Frontend falls back to mock data when API fails
- Check browser console for error message

**Solution:**
- Verify backend is running
- Check API endpoint is accessible
- Verify user is authenticated (has valid JWT)

### Problem: Notifications work for some accounts but not others

**Diagnosis:**
- Some user accounts might not have notifications in database

**Solution:**
- Run seed script to create notifications for ALL users
- Or manually create notifications for specific users

---

## 📊 Database Queries for Verification

```sql
-- Count notifications per user
SELECT u.email, COUNT(n.id) as notification_count
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.email
ORDER BY notification_count DESC;

-- Show recent notifications
SELECT n.*, u.email
FROM notifications n
JOIN users u ON n.user_id = u.id
ORDER BY n.created_at DESC
LIMIT 10;

-- Count unread notifications per user
SELECT u.email, COUNT(n.id) as unread_count
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id AND n.is_read = false
GROUP BY u.email;
```

---

## 🎯 Summary

✅ **Notification system uses REAL endpoints** (not dummy data)
✅ **Backend API is fully functional**
✅ **Database schema is properly set up**
⚠️ **You just need to seed sample data** using the provided script

Run the seeding script to populate notifications for all 4 account types, then test!
