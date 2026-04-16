#!/bin/bash

# ====================================
# Test Notification Seeder
# Creates notifications for all users
# ====================================

set -e

echo "🔔 Creating Test Notifications for All Users"
echo "=============================================="

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-itiyum_platform}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}📡 Connecting to database...${NC}"

# SQL script to create test notifications
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << 'EOF'

-- ====================================
-- Clean up old test notifications (optional)
-- ====================================
-- DELETE FROM notifications WHERE message LIKE '%[TEST]%';

-- ====================================
-- Get all active users with their tenant_id
-- ====================================
DO $$
DECLARE
    user_record RECORD;
    notification_types TEXT[] := ARRAY[
        'new_booking',
        'booking_confirmed', 
        'booking_cancelled',
        'new_review',
        'payment_received',
        'new_message',
        'new_follower',
        'subscription_expiring',
        'promotion_approved'
    ];
    type_name TEXT;
    counter INT := 0;
BEGIN
    -- Loop through all active users
    FOR user_record IN 
        SELECT id, email, role, tenant_id, first_name, last_name
        FROM users 
        WHERE account_status = 'active'
    LOOP
        RAISE NOTICE 'Creating notifications for: % (%) - Role: %', 
            user_record.email, 
            COALESCE(user_record.first_name || ' ' || user_record.last_name, 'User'),
            user_record.role;
        
        -- Create 3-5 varied notifications per user
        FOREACH type_name IN ARRAY notification_types[1:5]
        LOOP
            counter := counter + 1;
            
            -- Insert notification based on type
            CASE type_name
                WHEN 'new_booking' THEN
                    INSERT INTO notifications (
                        id, user_id, tenant_id, type, title, message, 
                        is_read, data, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        user_record.tenant_id,
                        'booking',
                        'New Booking Received',
                        '[TEST] You have a new booking for tomorrow at 7:00 PM',
                        FALSE,
                        jsonb_build_object(
                            'icon', '📅',
                            'action_url', '/dashboard/' || 
                                CASE user_record.role
                                    WHEN 'business_owner' THEN 'business'
                                    WHEN 'specialist' THEN 'specialist'
                                    WHEN 'food_enthusiast' THEN 'food-enthusiast'
                                    ELSE 'user'
                                END || '/bookings',
                            'booking_id', gen_random_uuid()::text
                        ),
                        NOW() - (random() * interval '2 hours')
                    );
                
                WHEN 'booking_confirmed' THEN
                    INSERT INTO notifications (
                        id, user_id, tenant_id, type, title, message,
                        is_read, data, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        user_record.tenant_id,
                        'success',
                        'Booking Confirmed',
                        '[TEST] Your booking has been confirmed by the restaurant',
                        counter % 2 = 0, -- Some read, some unread
                        jsonb_build_object(
                            'icon', '✅',
                            'action_url', '/dashboard/' || 
                                CASE user_record.role
                                    WHEN 'business_owner' THEN 'business'
                                    WHEN 'specialist' THEN 'specialist'
                                    WHEN 'food_enthusiast' THEN 'food-enthusiast'
                                    ELSE 'user'
                                END || '/bookings'
                        ),
                        NOW() - (random() * interval '5 hours')
                    );
                
                WHEN 'new_review' THEN
                    INSERT INTO notifications (
                        id, user_id, tenant_id, type, title, message,
                        is_read, data, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        user_record.tenant_id,
                        'review',
                        'New Review Posted',
                        '[TEST] Someone left a 5-star review on your profile!',
                        FALSE,
                        jsonb_build_object(
                            'icon', '⭐',
                            'action_url', '/dashboard/' || 
                                CASE user_record.role
                                    WHEN 'business_owner' THEN 'business'
                                    WHEN 'specialist' THEN 'specialist'
                                    ELSE 'user'
                                END || '/reviews'
                        ),
                        NOW() - (random() * interval '1 day')
                    );
                
                WHEN 'payment_received' THEN
                    INSERT INTO notifications (
                        id, user_id, tenant_id, type, title, message,
                        is_read, data, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        user_record.tenant_id,
                        'success',
                        'Payment Received',
                        '[TEST] You received a payment of $125.00',
                        counter % 3 = 0,
                        jsonb_build_object(
                            'icon', '💰',
                            'action_url', '/dashboard/' || 
                                CASE user_record.role
                                    WHEN 'business_owner' THEN 'business'
                                    WHEN 'specialist' THEN 'specialist'
                                    ELSE 'user'
                                END || '/wallet',
                            'amount', 125.00
                        ),
                        NOW() - (random() * interval '3 hours')
                    );
                
                WHEN 'new_message' THEN
                    INSERT INTO notifications (
                        id, user_id, tenant_id, type, title, message,
                        is_read, data, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        user_record.tenant_id,
                        'message',
                        'New Message',
                        '[TEST] You have a new message from Sarah Johnson',
                        FALSE,
                        jsonb_build_object(
                            'icon', '💬',
                            'action_url', '/messages'
                        ),
                        NOW() - (random() * interval '30 minutes')
                    );
            END CASE;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Created % test notifications', counter;
END $$;

-- ====================================
-- Summary of created notifications
-- ====================================
SELECT 
    u.email,
    u.role,
    COUNT(*) as notification_count,
    SUM(CASE WHEN n.is_read = false THEN 1 ELSE 0 END) as unread_count
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.message LIKE '%[TEST]%'
GROUP BY u.email, u.role
ORDER BY u.role, u.email;

EOF

echo -e "${GREEN}✅ Test notifications created successfully!${NC}"
echo ""
echo -e "${YELLOW}📊 Summary:${NC}"
echo "- Notifications have been created for all active users"
echo "- Each user has 3-5 different notification types"
echo "- Some notifications are marked as read, others as unread"
echo "- All test notifications are prefixed with [TEST]"
echo ""
echo -e "${BLUE}🧪 To test:${NC}"
echo "1. Login with any user account"
echo "2. Check the notification bell in the sidebar"
echo "3. You should see user-specific notifications only"
echo "4. Try marking notifications as read/unread"
echo "5. Try deleting notifications"
echo ""
echo -e "${YELLOW}🗑️  To clean up test notifications:${NC}"
echo "Run: PGPASSWORD=\$DB_PASSWORD psql -h \$DB_HOST -U \$DB_USER -d \$DB_NAME -c \"DELETE FROM notifications WHERE message LIKE '%[TEST]%';\""
