const pool = require('../config/database');

/**
 * Notification Helper
 * Centralized utility for creating and managing notifications
 */

/**
 * Create a notification for a user
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - User ID to notify
 * @param {string} params.tenantId - Tenant ID
 * @param {string} params.type - Notification type (booking, review, message, success, warning, error, info)
 * @param {string} params.title - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.actionUrl] - Optional URL to navigate to when clicked
 * @param {Object} [params.metadata] - Optional additional data
 * @returns {Promise<Object>} Created notification
 */
async function createNotification({ userId, tenantId, type, title, message, actionUrl, metadata = {} }) {
  try {
    const data = { ...metadata };
    if (actionUrl) {
      data.action_url = actionUrl;
    }

    const result = await pool.query(`
      INSERT INTO notifications (
        user_id,
        tenant_id,
        type,
        title,
        message,
        data,
        is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING *
    `, [userId, tenantId, type, title, message, JSON.stringify(data)]);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Create booking confirmation notification
 */
async function notifyBookingConfirmed({ userId, tenantId, businessName, bookingDate, bookingTime, bookingId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'booking',
    title: 'Booking Confirmed',
    message: `Your table reservation at ${businessName} has been confirmed for ${bookingDate} at ${bookingTime}.`,
    actionUrl: `/dashboard/user/bookings/${bookingId}`,
    metadata: { bookingId, businessName, bookingDate, bookingTime }
  });
}

/**
 * Create booking cancellation notification
 */
async function notifyBookingCancelled({ userId, tenantId, businessName, bookingDate, bookingTime, reason }) {
  return createNotification({
    userId,
    tenantId,
    type: 'warning',
    title: 'Booking Cancelled',
    message: `Your reservation at ${businessName} for ${bookingDate} at ${bookingTime} has been cancelled. ${reason || ''}`,
    actionUrl: '/dashboard/user/bookings',
    metadata: { businessName, bookingDate, bookingTime, reason }
  });
}

/**
 * Create new review notification for business owner
 */
async function notifyNewReview({ userId, tenantId, businessName, rating, reviewerName, businessId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'review',
    title: 'New Review Received',
    message: `${reviewerName} left a ${rating}-star review for ${businessName}.`,
    actionUrl: `/dashboard/business/reviews`,
    metadata: { businessId, businessName, rating, reviewerName }
  });
}

/**
 * Create review response notification for reviewer
 */
async function notifyReviewResponse({ userId, tenantId, businessName, reviewId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'message',
    title: 'Business Responded to Your Review',
    message: `${businessName} has responded to your review.`,
    actionUrl: `/restaurants/${reviewId}`,
    metadata: { businessName, reviewId }
  });
}

/**
 * Create payment success notification
 */
async function notifyPaymentSuccess({ userId, tenantId, amount, currency, description, transactionId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'success',
    title: 'Payment Successful',
    message: `Your payment of ${currency} ${amount} has been processed successfully. ${description || ''}`,
    actionUrl: '/dashboard/user/wallet',
    metadata: { amount, currency, description, transactionId }
  });
}

/**
 * Create payment failed notification
 */
async function notifyPaymentFailed({ userId, tenantId, amount, currency, reason }) {
  return createNotification({
    userId,
    tenantId,
    type: 'error',
    title: 'Payment Failed',
    message: `Your payment of ${currency} ${amount} could not be processed. ${reason || 'Please try again.'}`,
    actionUrl: '/dashboard/user/wallet',
    metadata: { amount, currency, reason }
  });
}

/**
 * Create ad campaign status notification
 */
async function notifyAdCampaignStatus({ userId, tenantId, campaignName, status, campaignId }) {
  const statusMessages = {
    active: `Your ad campaign "${campaignName}" is now live!`,
    paused: `Your ad campaign "${campaignName}" has been paused.`,
    completed: `Your ad campaign "${campaignName}" has completed.`,
    rejected: `Your ad campaign "${campaignName}" was not approved. Please review and resubmit.`
  };

  return createNotification({
    userId,
    tenantId,
    type: status === 'rejected' ? 'warning' : 'info',
    title: 'Ad Campaign Update',
    message: statusMessages[status] || `Your ad campaign "${campaignName}" status: ${status}`,
    actionUrl: `/dashboard/business/ads/${campaignId}`,
    metadata: { campaignId, campaignName, status }
  });
}

module.exports = {
  createNotification,
  notifyBookingConfirmed,
  notifyBookingCancelled,
  notifyNewReview,
  notifyReviewResponse,
  notifyPaymentSuccess,
  notifyPaymentFailed,
  notifyAdCampaignStatus
};

