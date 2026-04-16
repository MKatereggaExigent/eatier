#!/usr/bin/env node

/**
 * Seed Notifications Script
 * 
 * This script creates sample notifications for all user accounts in the database.
 * It ensures notifications work for all 4 account types:
 * - Regular users
 * - Business owners
 * - Specialists
 * - Admins
 */

const { Pool } = require('pg');
const {
  getSocialRoute,
  getMessagesRoute,
  getBookingsRoute,
  getReviewsRoute,
  getWalletRoute,
  getSettingsRoute
} = require('../utils/roleBasedRoutes');

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'itiyum_platform',
  user: process.env.DB_USER || 'itiyum_user',
  password: process.env.DB_PASSWORD
});

// Comprehensive notification templates covering ALL features
const notificationTemplates = [
  // 1. MESSAGING & CHAT
  {
    type: 'message',
    title: 'New Message',
    getMessage: (userName) => `You have a new message from a customer.`,
    action_url: '{messagesRoute}',
    icon: '💬',
    read: false
  },
  {
    type: 'message',
    title: 'Chat Request',
    getMessage: (userName) => `Sarah wants to connect with you. Accept the chat request!`,
    action_url: '{messagesRoute}',
    icon: '💬',
    read: false
  },

  // 2. SOCIAL INTERACTIONS
  {
    type: 'social',
    title: 'New Follower',
    getMessage: (userName) => `John Smith started following you!`,
    action_url: '{socialRoute}',
    icon: '👥',
    read: false
  },
  {
    type: 'social',
    title: 'Poke Received',
    getMessage: (userName) => `Emily poked you! Say hi back!`,
    action_url: '{socialRoute}',
    icon: '👋',
    read: false
  },
  {
    type: 'social',
    title: 'Post Like',
    getMessage: (userName) => `Michael liked your post about Italian cuisine.`,
    action_url: '/community',
    icon: '❤️',
    read: true
  },
  {
    type: 'social',
    title: 'New Comment',
    getMessage: (userName) => `Lisa commented on your post: "This looks amazing!"`,
    action_url: '/community',
    icon: '💭',
    read: false
  },

  // 3. BOOKINGS
  {
    type: 'booking',
    title: 'Booking Confirmed',
    getMessage: (userName) => `Your table reservation has been confirmed for tomorrow at 7:00 PM.`,
    action_url: '{bookingsRoute}',
    icon: '📅',
    read: false
  },
  {
    type: 'booking',
    title: 'New Booking Request',
    getMessage: (userName) => `You have a new booking request for 4 people on Friday.`,
    action_url: '{bookingsRoute}',
    icon: '📅',
    read: false
  },
  {
    type: 'booking',
    title: 'Booking Reminder',
    getMessage: (userName) => `Reminder: Your reservation at The Savory Kitchen is in 2 hours.`,
    action_url: '{bookingsRoute}',
    icon: '⏰',
    read: true
  },

  // 4. REVIEWS
  {
    type: 'review',
    title: 'New Review',
    getMessage: (userName) => `Someone left a 5-star review for your restaurant!`,
    action_url: '{reviewsRoute}',
    icon: '⭐',
    read: false
  },
  {
    type: 'review',
    title: 'Review Response',
    getMessage: (userName) => `The restaurant owner responded to your review.`,
    action_url: '{reviewsRoute}',
    icon: '⭐',
    read: true
  },

  // 5. PAYMENTS & PURCHASES
  {
    type: 'payment',
    title: 'Payment Successful',
    getMessage: (userName) => `Your payment of $45.00 has been processed successfully.`,
    action_url: '{walletRoute}',
    icon: '✅',
    read: true
  },
  {
    type: 'payment',
    title: 'Purchase Complete',
    getMessage: (userName) => `Your order #12345 has been confirmed. Thank you!`,
    action_url: '{walletRoute}',
    icon: '🛍️',
    read: false
  },
  {
    type: 'payment',
    title: 'Refund Processed',
    getMessage: (userName) => `Your refund of $25.00 has been processed to your wallet.`,
    action_url: '{walletRoute}',
    icon: '💰',
    read: true
  },

  // 6. SUBSCRIPTIONS
  {
    type: 'subscription',
    title: 'Subscription Expiring Soon',
    getMessage: (userName) => `Your premium subscription expires in 7 days. Renew now to keep your benefits!`,
    action_url: '/dashboard/subscriptions',
    icon: '⚠️',
    read: false
  },
  {
    type: 'subscription',
    title: 'Subscription Activated',
    getMessage: (userName) => `Welcome to Premium! Your subscription is now active.`,
    action_url: '/dashboard/subscriptions',
    icon: '🎉',
    read: true
  },

  // 7. EMAIL NOTIFICATIONS
  {
    type: 'email',
    title: 'Email Verified',
    getMessage: (userName) => `Your email address has been successfully verified.`,
    action_url: '{settingsRoute}',
    icon: '✉️',
    read: true
  },

  // 8. SYSTEM & ACCOUNT
  {
    type: 'info',
    title: 'Profile Updated',
    getMessage: (userName) => `Your profile has been successfully updated.`,
    action_url: '{settingsRoute}',
    icon: 'ℹ️',
    read: true
  },
  {
    type: 'security',
    title: 'New Login Detected',
    getMessage: (userName) => `New login from Chrome on Mac. Was this you?`,
    action_url: '{settingsRoute}/security',
    icon: '🔐',
    read: false
  },

  // 9. PROMOTIONS & OFFERS
  {
    type: 'promo',
    title: 'Special Offer',
    getMessage: (userName) => `Get 20% off your next booking! Limited time offer.`,
    action_url: '/promotions',
    icon: '🎁',
    read: false
  },

  // 10. INQUIRIES (Business Owners)
  {
    type: 'inquiry',
    title: 'New Inquiry',
    getMessage: (userName) => `You have a new inquiry from a potential customer.`,
    action_url: '/business/inquiries',
    icon: '📧',
    read: false
  }
];

/**
 * Get time offset in hours for realistic timestamps
 */
function getTimeOffset(index) {
  const offsets = [0.5, 2, 5, 24, 48, 72]; // hours ago
  return offsets[index] || 1;
}

/**
 * Seed notifications for all users
 */
async function seedNotifications() {
  const client = await pool.connect();

  try {
    console.log('🌱 Starting notification seeding...\n');

    // Get all users with their tenant information
    const usersResult = await client.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.display_name,
        u.tenant_id,
        u.role,
        t.name as tenant_name
      FROM users u
      LEFT JOIN tenants t ON u.tenant_id = t.id
      ORDER BY u.created_at DESC
    `);

    const users = usersResult.rows;
    console.log(`📊 Found ${users.length} users to seed notifications for\n`);

    if (users.length === 0) {
      console.log('❌ No users found in database. Please create users first.');
      return;
    }

    let totalNotificationsCreated = 0;

    // Create notifications for each user
    for (const user of users) {
      console.log(`👤 Creating notifications for: ${user.display_name || user.email} (${user.role})`);

      // Clear existing notifications for this user (optional - remove if you want to keep old notifications)
      await client.query(
        'DELETE FROM notifications WHERE user_id = $1 AND tenant_id = $2',
        [user.user_id, user.tenant_id]
      );

      let notificationsCreated = 0;

      // Create each type of notification for the user
      for (let i = 0; i < notificationTemplates.length; i++) {
        const template = notificationTemplates[i];
        const hoursAgo = getTimeOffset(i);
        const timestamp = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);

        // Resolve action URL based on user role
        let actionUrl = template.action_url;
        if (actionUrl.includes('{socialRoute}')) {
          actionUrl = getSocialRoute(user.role);
        } else if (actionUrl.includes('{messagesRoute}')) {
          actionUrl = getMessagesRoute(user.role);
        } else if (actionUrl.includes('{bookingsRoute}')) {
          actionUrl = getBookingsRoute(user.role);
        } else if (actionUrl.includes('{reviewsRoute}')) {
          actionUrl = getReviewsRoute(user.role);
        } else if (actionUrl.includes('{walletRoute}')) {
          actionUrl = getWalletRoute(user.role);
        } else if (actionUrl.includes('{settingsRoute}')) {
          actionUrl = getSettingsRoute(user.role);
        }

        const result = await client.query(`
          INSERT INTO notifications (
            tenant_id,
            user_id,
            type,
            title,
            message,
            is_read,
            created_at,
            data
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          user.tenant_id,
          user.user_id,
          template.type,
          template.title,
          template.getMessage(user.display_name || user.email),
          template.read,
          timestamp,
          JSON.stringify({ action_url: actionUrl })
        ]);

        notificationsCreated++;
      }

      console.log(`   ✅ Created ${notificationsCreated} notifications\n`);
      totalNotificationsCreated += notificationsCreated;
    }

    console.log(`\n🎉 Successfully seeded ${totalNotificationsCreated} notifications for ${users.length} users!`);
    console.log(`\n📋 Summary:`);
    console.log(`   - Users processed: ${users.length}`);
    console.log(`   - Notifications per user: ${notificationTemplates.length}`);
    console.log(`   - Total notifications created: ${totalNotificationsCreated}`);

  } catch (error) {
    console.error('❌ Error seeding notifications:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the script
seedNotifications()
  .then(() => {
    console.log('\n✨ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seeding failed:', error);
    process.exit(1);
  });
