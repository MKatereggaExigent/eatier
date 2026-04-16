#!/bin/bash

# =============================================================================
# Seed Notifications Script
# =============================================================================
# This script seeds sample notifications for all users in the database
# Supports both Docker and local PostgreSQL setups
# =============================================================================

set -e  # Exit on error

echo "🌱 Seeding Notifications for All Users"
echo "========================================"
echo ""

# Detect environment
if command -v docker &> /dev/null && docker ps | grep -q "itiyum-postgres"; then
    echo "🐳 Using Docker PostgreSQL container"
    PSQL_CMD="docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform"
elif command -v psql &> /dev/null; then
    echo "💻 Using local PostgreSQL"
    PSQL_CMD="psql -U itiyum_user -d itiyum_platform"
else
    echo "❌ Error: Neither Docker nor local PostgreSQL found"
    exit 1
fi

echo ""
echo "1️⃣  Fetching all users..."

# Get count of users
USER_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM users;" | tr -d ' ')
echo "   Found $USER_COUNT users in database"

if [ "$USER_COUNT" -eq "0" ]; then
    echo "   ❌ No users found. Please create users first."
    exit 1
fi

echo ""
echo "2️⃣  Clearing existing sample notifications..."
$PSQL_CMD -c "DELETE FROM notifications WHERE type IN ('message', 'social', 'booking', 'review', 'payment', 'subscription', 'email', 'info', 'security', 'promo', 'inquiry');" > /dev/null
echo "   ✅ Cleared old sample notifications"

echo ""
echo "3️⃣  Creating new notifications for each user..."

# SQL to insert comprehensive notifications for all users
$PSQL_CMD <<EOF
-- Insert comprehensive notifications covering all features for all users
INSERT INTO notifications (tenant_id, user_id, type, title, message, is_read, created_at, data)
SELECT
    u.tenant_id,
    u.id,
    n.type,
    n.title,
    n.message,
    n.is_read,
    NOW() - (n.hours_ago || ' hours')::INTERVAL,
    n.data::jsonb
FROM users u
CROSS JOIN (
    VALUES
        -- MESSAGING & CHAT (2 notifications)
        ('message', 'New Message', 'You have a new message from a customer.', false, 0.5, '{"action_url": "/messages"}'),
        ('message', 'Chat Request', 'Sarah wants to connect with you. Accept the chat request!', false, 1, '{"action_url": "/messages"}'),

        -- SOCIAL INTERACTIONS (4 notifications)
        ('social', 'New Follower', 'John Smith started following you!', false, 2, '{"action_url": "/dashboard/social"}'),
        ('social', 'Poke Received', 'Emily poked you! Say hi back!', false, 3, '{"action_url": "/dashboard/social"}'),
        ('social', 'Post Like', 'Michael liked your post about Italian cuisine.', true, 24, '{"action_url": "/community"}'),
        ('social', 'New Comment', 'Lisa commented on your post: "This looks amazing!"', false, 4, '{"action_url": "/community"}'),

        -- BOOKINGS (3 notifications)
        ('booking', 'Booking Confirmed', 'Your table reservation has been confirmed for tomorrow at 7:00 PM.', false, 5, '{"action_url": "/dashboard/bookings"}'),
        ('booking', 'New Booking Request', 'You have a new booking request for 4 people on Friday.', false, 6, '{"action_url": "/dashboard/bookings"}'),
        ('booking', 'Booking Reminder', 'Reminder: Your reservation at The Savory Kitchen is in 2 hours.', true, 48, '{"action_url": "/dashboard/bookings"}'),

        -- REVIEWS (2 notifications)
        ('review', 'New Review', 'Someone left a 5-star review for your restaurant!', false, 8, '{"action_url": "/dashboard/reviews"}'),
        ('review', 'Review Response', 'The restaurant owner responded to your review.', true, 72, '{"action_url": "/dashboard/reviews"}'),

        -- PAYMENTS & PURCHASES (3 notifications)
        ('payment', 'Payment Successful', 'Your payment of \$45.00 has been processed successfully.', true, 96, '{"action_url": "/dashboard/wallet"}'),
        ('payment', 'Purchase Complete', 'Your order #12345 has been confirmed. Thank you!', false, 10, '{"action_url": "/dashboard/orders"}'),
        ('payment', 'Refund Processed', 'Your refund of \$25.00 has been processed to your wallet.', true, 120, '{"action_url": "/dashboard/wallet"}'),

        -- SUBSCRIPTIONS (2 notifications)
        ('subscription', 'Subscription Expiring Soon', 'Your premium subscription expires in 7 days. Renew now!', false, 12, '{"action_url": "/dashboard/subscriptions"}'),
        ('subscription', 'Subscription Activated', 'Welcome to Premium! Your subscription is now active.', true, 144, '{"action_url": "/dashboard/subscriptions"}'),

        -- EMAIL (1 notification)
        ('email', 'Email Verified', 'Your email address has been successfully verified.', true, 168, '{"action_url": "/dashboard/settings"}'),

        -- SYSTEM & ACCOUNT (2 notifications)
        ('info', 'Profile Updated', 'Your profile has been successfully updated.', true, 192, '{"action_url": "/dashboard/settings"}'),
        ('security', 'New Login Detected', 'New login from Chrome on Mac. Was this you?', false, 14, '{"action_url": "/dashboard/settings/security"}'),

        -- PROMOTIONS (1 notification)
        ('promo', 'Special Offer', 'Get 20% off your next booking! Limited time offer.', false, 16, '{"action_url": "/dashboard/promotions"}'),

        -- INQUIRIES (1 notification - for business owners)
        ('inquiry', 'New Inquiry', 'You have a new inquiry from a potential customer.', false, 18, '{"action_url": "/dashboard/inquiries"}')
) AS n(type, title, message, is_read, hours_ago, data);
EOF

# Get notification count
NOTIFICATION_COUNT=$($PSQL_CMD -t -c "SELECT COUNT(*) FROM notifications;" | tr -d ' ')

echo ""
echo "✅ Seeding Complete!"
echo "===================="
echo "   Users: $USER_COUNT"
echo "   Notifications per user: 21"
echo "   Total notifications: $NOTIFICATION_COUNT"
echo ""
echo "📋 Notification Categories Created:"
echo "   • 2 Messaging/Chat notifications"
echo "   • 4 Social interactions (followers, pokes, likes, comments)"
echo "   • 3 Booking notifications"
echo "   • 2 Review notifications"
echo "   • 3 Payment/Purchase notifications"
echo "   • 2 Subscription notifications"
echo "   • 1 Email notification"
echo "   • 2 System/Account notifications"
echo "   • 1 Promotion notification"
echo "   • 1 Inquiry notification"
echo ""

echo "📊 Verification Query:"
echo "----------------------"
$PSQL_CMD <<EOF
SELECT
    u.email,
    u.role,
    COUNT(n.id) as total_notifications,
    SUM(CASE WHEN n.is_read = false THEN 1 ELSE 0 END) as unread_count
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.email, u.role
ORDER BY total_notifications DESC
LIMIT 10;
EOF

echo ""
echo "🎉 Done! All users now have comprehensive notifications covering ALL features!"
echo ""
echo "Next steps:"
echo "  1. Login to the application with any account type:"
echo "     • Regular User"
echo "     • Business Owner"
echo "     • Specialist"
echo "     • Admin"
echo "  2. Click the bell icon (🔔) in the top right corner"
echo "  3. You should see 21 notifications covering:"
echo "     ✓ Messages & Chat"
echo "     ✓ Social (followers, pokes, likes, comments)"
echo "     ✓ Bookings"
echo "     ✓ Reviews"
echo "     ✓ Payments & Purchases"
echo "     ✓ Subscriptions"
echo "     ✓ Email verification"
echo "     ✓ Security alerts"
echo "     ✓ Promotions"
echo "     ✓ Inquiries"
echo ""
