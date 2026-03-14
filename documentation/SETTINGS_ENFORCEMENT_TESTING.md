# Settings Enforcement Testing Guide

This document provides step-by-step instructions to test that all admin settings are actually enforced in the application.

## Prerequisites
- Backend server running on port 3001
- Frontend running on port 4200
- Admin access to http://localhost:4200/admin/settings

---

## 1. Maintenance Mode Testing

### Test Steps:
1. **Enable Maintenance Mode:**
   - Go to http://localhost:4200/admin/settings
   - Click on "General" tab
   - Toggle "Maintenance Mode" to ON
   - Click "Save Changes"

2. **Test as Non-Admin User:**
   - Open an incognito/private browser window
   - Try to access http://localhost:4200
   - **Expected Result:** You should see a 503 error or maintenance message
   - Try to access any API endpoint (e.g., http://localhost:3001/api/businesses)
   - **Expected Result:** Should return 503 with maintenance mode message

3. **Test as Admin User:**
   - In your admin browser window, navigate around the site
   - **Expected Result:** Admin users should still have full access

4. **Disable Maintenance Mode:**
   - Toggle "Maintenance Mode" to OFF
   - Click "Save Changes"
   - **Expected Result:** Non-admin users can now access the site again

---

## 2. Allow Registrations Testing

### Test Steps:
1. **Disable Registrations:**
   - Go to http://localhost:4200/admin/settings
   - Click on "General" tab
   - Toggle "Allow Registrations" to OFF
   - Click "Save Changes"

2. **Test Registration Endpoint:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test123!",
       "firstName": "Test",
       "lastName": "User"
     }'
   ```
   - **Expected Result:** Should return 403 error with message "Registrations are currently disabled"

3. **Re-enable Registrations:**
   - Toggle "Allow Registrations" to ON
   - Click "Save Changes"
   - Run the same curl command
   - **Expected Result:** Registration should succeed (or fail with "User already exists" if you ran it before)

---

## 3. Password Requirements Testing

### Test Steps:
1. **Update Password Requirements:**
   - Go to http://localhost:4200/admin/settings
   - Click on "Security" tab
   - Set "Minimum Password Length" to 12
   - Enable "Require Special Character"
   - Click "Save Changes"

2. **Test with Weak Password:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "newuser@example.com",
       "password": "Test123",
       "firstName": "New",
       "lastName": "User"
     }'
   ```
   - **Expected Result:** Should return 400 error with details about password requirements:
     - "Password must be at least 12 characters long"
     - "Password must contain at least one special character"

3. **Test with Strong Password:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "newuser@example.com",
       "password": "Test123!@#$%",
       "firstName": "New",
       "lastName": "User"
     }'
   ```
   - **Expected Result:** Registration should succeed

4. **Get Password Requirements:**
   ```bash
   curl http://localhost:3001/api/auth/password-requirements
   ```
   - **Expected Result:** Should return current password requirements

---

## 4. Login Attempt Tracking & Lockout Testing

### Test Steps:
1. **Configure Lockout Settings:**
   - Go to http://localhost:4200/admin/settings
   - Click on "Security" tab
   - Set "Max Login Attempts" to 3
   - Set "Lockout Duration" to 5 minutes
   - Click "Save Changes"

2. **Test Failed Login Attempts:**
   ```bash
   # Attempt 1 (wrong password)
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@itiyum.com",
       "password": "wrongpassword"
     }'
   ```
   - **Expected Result:** 401 error with "attemptsRemaining": 2

   ```bash
   # Attempt 2 (wrong password)
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@itiyum.com",
       "password": "wrongpassword"
     }'
   ```
   - **Expected Result:** 401 error with "attemptsRemaining": 1

   ```bash
   # Attempt 3 (wrong password) - This should lock the account
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@itiyum.com",
       "password": "wrongpassword"
     }'
   ```
   - **Expected Result:** 423 error with "Account locked" message and lockout duration

3. **Test Locked Account:**
   ```bash
   # Try to login with CORRECT password while locked
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@itiyum.com",
       "password": "Admin123!"
     }'
   ```
   - **Expected Result:** 423 error indicating account is still locked

4. **Wait for Lockout to Expire:**
   - Wait 5 minutes (or the configured lockout duration)
   - Try logging in with correct password
   - **Expected Result:** Login should succeed and failed attempts should be reset to 0

---

## 5. Session Timeout Testing

### Test Steps:
1. **Configure Session Timeout:**
   - Go to http://localhost:4200/admin/settings
   - Click on "Security" tab
   - Set "Session Timeout" to 2 minutes
   - Click "Save Changes"

2. **Test Login with New Timeout:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@itiyum.com",
       "password": "Admin123!"
     }' -v
   ```
   - **Expected Result:** Response should include `expiresIn: 120` (2 minutes in seconds)
   - Check the `Set-Cookie` header - `max-age` should be 120

3. **Wait for Token to Expire:**
   - Wait 2 minutes
   - Try to access a protected endpoint with the token
   - **Expected Result:** Should return 401 "Token expired" error

---

## 6. Booking Settings Testing

### Test Steps:
1. **Configure Booking Settings:**
   - Go to http://localhost:4200/admin/settings
   - Click on "Bookings" tab
   - Enable "Auto-confirm Bookings"
   - Set "Cancellation Hours" to 48
   - Click "Save Changes"

2. **Test Booking Creation:**
   - Create a new booking through the UI or API
   - **Expected Result:** Booking should be automatically confirmed (status = 'confirmed')

3. **Test Booking Cancellation:**
   - Try to cancel a booking that's less than 48 hours away
   - **Expected Result:** Should be prevented or show warning about cancellation policy

---

## 7. Business Settings Testing

### Test Steps:
1. **Configure Business Settings:**
   - Go to http://localhost:4200/admin/settings
   - Click on "Businesses" tab
   - Enable "Require Verification"
   - Set "Max Businesses Per User" to 2
   - Click "Save Changes"

2. **Test Business Creation:**
   - Create a new business as a business owner
   - **Expected Result:** Business should be created with status 'pending' (requires verification)

3. **Test Business Limit:**
   - Try to create a 3rd business for the same user
   - **Expected Result:** Should be prevented with error about max businesses limit

---

## Verification Checklist

- [ ] Maintenance mode blocks non-admin users
- [ ] Maintenance mode allows admin users
- [ ] Registrations can be disabled
- [ ] Password requirements are enforced
- [ ] Failed login attempts are tracked
- [ ] Account lockout works after max attempts
- [ ] Lockout expires after configured duration
- [ ] Session timeout is dynamic based on settings
- [ ] Settings changes take effect immediately (cache is cleared)
- [ ] All settings persist after page refresh

---

## Troubleshooting

### Settings Not Taking Effect
- Check that you clicked "Save Changes"
- Verify the backend server restarted successfully
- Check browser console for errors
- Check backend logs for errors

### Cache Issues
- Settings are cached for 5 minutes
- Updating settings clears the cache automatically
- If issues persist, restart the backend server

### Database Issues
- Verify the `failed_login_attempts` and `locked_until` columns exist in the `users` table
- Run the migration: `cd backend && node -e "...migration script..."`

---

## Notes

- All settings are stored in the `tenants.settings` JSONB column
- Settings are cached for 5 minutes for performance
- Cache is automatically cleared when settings are updated
- Maintenance mode check runs on every request
- Login attempt tracking is per-user, not per-IP

