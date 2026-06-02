#!/bin/bash

# ====================================
# Seed Test Notifications (Docker Version)
# Run from host machine
# ====================================

set -e

echo "🔔 Seeding Test Notifications via Docker"
echo "=========================================="

# Run the SQL script inside the PostgreSQL container
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform << 'EOF'

-- Clean up old test notifications (optional)
-- DELETE FROM notifications WHERE message LIKE '%[TEST]%';

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
    FOR user_record IN 
        SELECT id, email, role, tenant_id, first_name, last_name
        FROM users 
        WHERE account_status = 'active'
        LIMIT 20 -- Limit to first 20 users for testing
    LOOP
        RAISE NOTICE 'Creating notifications for: % (%) - Role: %', 
            user_record.email, 
            COALESCE(user_record.first_name || ' ' || user_record.last_name, 'User'),
            user_record.role;
        
        FOREACH type_name IN ARRAY notification_types[1:5]
        LOOP
            counter := counter + 1;
            
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
                
                WHEN 'new_review' THEN
                    INSERT INTO notifications (
                        id, user_id, tenant_id, type, title, message,
                        is_read, data, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        user_record.tenant_id,
                        'review',
                        'New 5-Star Review!',
                        '[TEST] Someone left a 5-star review: "Amazing experience!"',
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
                        '[TEST] You have a new message from a customer',
                        FALSE,
                        jsonb_build_object(
                            'icon', '💬',
                            'action_url', '/messages'
                        ),
                        NOW() - (random() * interval '30 minutes')
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
                                    ELSE 'user'
                                END || '/wallet',
                            'amount', 125.00
                        ),
                        NOW() - (random() * interval '3 hours')
                    );
                
                WHEN 'new_follower' THEN
                    INSERT INTO notifications (
                        id, user_id, tenant_id, type, title, message,
                        is_read, data, created_at
                    ) VALUES (
                        gen_random_uuid(),
                        user_record.id,
                        user_record.tenant_id,
                        'info',
                        'New Follower',
                        '[TEST] John Doe started following you',
                        counter % 2 = 0,
                        jsonb_build_object(
                            'icon', '👥',
                            'action_url', '/dashboard/user/social'
                        ),
                        NOW() - (random() * interval '6 hours')
                    );
            END CASE;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Created % test notifications', counter;
END $$;

-- Summary
\echo ''
\echo '📊 SUMMARY'
\echo '=========='
SELECT 
    u.email,
    u.role,
    COUNT(*) as notifications,
    SUM(CASE WHEN n.is_read = false THEN 1 ELSE 0 END) as unread
FROM notifications n
JOIN users u ON n.user_id = u.id
WHERE n.message LIKE '%[TEST]%'
GROUP BY u.email, u.role
ORDER BY u.role, u.email;

EOF

echo ""
echo "✅ Test notifications created!"
echo ""
echo "🧪 To test:"
echo "1. Login with different user accounts"
echo "2. Check notifications in sidebar"
echo "3. Each user should see ONLY their own notifications"
echo ""
echo "🗑️  To cleanup:"
echo "./scripts/cleanup_notifications_docker.sh"
