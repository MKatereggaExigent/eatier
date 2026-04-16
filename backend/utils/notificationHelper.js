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

/**
 * Create specialist booking confirmed notification (for client)
 */
async function notifySpecialistBookingConfirmed({ userId, tenantId, specialistName, eventType, bookingDate, bookingId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'success',
    title: 'Booking Request Accepted',
    message: `${specialistName} has accepted your ${eventType} booking request for ${bookingDate}.`,
    actionUrl: `/dashboard/user/specialist-bookings/${bookingId}`,
    metadata: { bookingId, specialistName, eventType, bookingDate }
  });
}

/**
 * Create specialist booking declined notification (for client)
 */
async function notifySpecialistBookingDeclined({ userId, tenantId, specialistName, eventType, bookingDate, reason }) {
  return createNotification({
    userId,
    tenantId,
    type: 'warning',
    title: 'Booking Request Declined',
    message: `${specialistName} has declined your ${eventType} booking request for ${bookingDate}. ${reason || ''}`,
    actionUrl: '/dashboard/user/specialist-bookings',
    metadata: { specialistName, eventType, bookingDate, reason }
  });
}

/**
 * Notify user they have a new follower
 */
async function notifyUserFollowed({ userId, tenantId, followerName, followerId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'social',
    title: 'New Follower',
    message: `${followerName} started following you`,
    actionUrl: `/profile/${followerId}`,
    metadata: {
      follower_id: followerId,
      follower_name: followerName
    }
  });
}

/**
 * Notify user of a new chat request
 */
async function notifyChatRequest({ userId, tenantId, requesterName, requesterId, requestId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'message',
    title: 'New Chat Request',
    message: `${requesterName} wants to chat with you`,
    actionUrl: `/messages/requests`,
    metadata: {
      requester_id: requesterId,
      requester_name: requesterName,
      request_id: requestId
    }
  });
}

/**
 * Notify user their chat request was accepted
 */
async function notifyChatRequestAccepted({ userId, tenantId, recipientName, recipientId, conversationId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'message',
    title: 'Chat Request Accepted',
    message: `${recipientName} accepted your chat request`,
    actionUrl: `/messages/${conversationId}`,
    metadata: {
      recipient_id: recipientId,
      recipient_name: recipientName,
      conversation_id: conversationId
    }
  });
}

/**
 * Notify user of a new message
 */
async function notifyNewMessage({ userId, tenantId, senderName, senderId, conversationId, messagePreview }) {
  return createNotification({
    userId,
    tenantId,
    type: 'message',
    title: `New message from ${senderName}`,
    message: messagePreview.substring(0, 100),
    actionUrl: `/messages/${conversationId}`,
    metadata: {
      sender_id: senderId,
      sender_name: senderName,
      conversation_id: conversationId
    }
  });
}

/**
 * Notify user they received a poke
 */
async function notifyPoke({ userId, tenantId, pokerName, pokerId, pokeMessage }) {
  return createNotification({
    userId,
    tenantId,
    type: 'social',
    title: 'Poke Received',
    message: pokeMessage ? `${pokerName} poked you: "${pokeMessage}"` : `${pokerName} poked you!`,
    actionUrl: `/dashboard/social`,
    metadata: {
      poker_id: pokerId,
      poker_name: pokerName,
      poke_message: pokeMessage
    }
  });
}

/**
 * Notify user their post was liked
 */
async function notifyPostLike({ userId, tenantId, likerName, likerId, postId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'social',
    title: 'Post Like',
    message: `${likerName} liked your post`,
    actionUrl: `/community/${postId}`,
    metadata: {
      liker_id: likerId,
      liker_name: likerName,
      post_id: postId
    }
  });
}

/**
 * Notify user of a new comment on their post
 */
async function notifyPostComment({ userId, tenantId, commenterName, commenterId, commentText, postId }) {
  const truncated = commentText.length > 50 ? commentText.substring(0, 50) + '...' : commentText;
  return createNotification({
    userId,
    tenantId,
    type: 'social',
    title: 'New Comment',
    message: `${commenterName} commented: "${truncated}"`,
    actionUrl: `/community/${postId}`,
    metadata: {
      commenter_id: commenterId,
      commenter_name: commenterName,
      post_id: postId
    }
  });
}

/**
 * Notify user of a purchase confirmation
 */
async function notifyPurchaseConfirmed({ userId, tenantId, orderNumber, itemCount, totalAmount, currency, orderId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'payment',
    title: 'Purchase Complete',
    message: `Your order #${orderNumber} (${itemCount} items) for ${currency} ${totalAmount} has been confirmed.`,
    actionUrl: `/dashboard/orders/${orderId}`,
    metadata: { orderNumber, itemCount, totalAmount, currency, orderId }
  });
}

/**
 * Notify user of a refund processed
 */
async function notifyRefundProcessed({ userId, tenantId, amount, currency, reason, orderId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'payment',
    title: 'Refund Processed',
    message: `Your refund of ${currency} ${amount} has been processed. ${reason || ''}`,
    actionUrl: `/dashboard/wallet`,
    metadata: { amount, currency, reason, orderId }
  });
}

/**
 * Notify user their subscription is expiring soon
 */
async function notifySubscriptionExpiring({ userId, tenantId, daysRemaining, planName }) {
  return createNotification({
    userId,
    tenantId,
    type: 'subscription',
    title: 'Subscription Expiring Soon',
    message: `Your ${planName} subscription expires in ${daysRemaining} days. Renew now to keep your benefits!`,
    actionUrl: '/dashboard/subscriptions',
    metadata: { daysRemaining, planName }
  });
}

/**
 * Notify user their subscription was activated
 */
async function notifySubscriptionActivated({ userId, tenantId, planName, expiresAt }) {
  return createNotification({
    userId,
    tenantId,
    type: 'subscription',
    title: 'Subscription Activated',
    message: `Welcome to ${planName}! Your subscription is now active.`,
    actionUrl: '/dashboard/subscriptions',
    metadata: { planName, expiresAt }
  });
}

/**
 * Notify user their email was verified
 */
async function notifyEmailVerified({ userId, tenantId, email }) {
  return createNotification({
    userId,
    tenantId,
    type: 'email',
    title: 'Email Verified',
    message: `Your email address ${email} has been successfully verified.`,
    actionUrl: '/dashboard/settings',
    metadata: { email }
  });
}

/**
 * Notify user of a new login
 */
async function notifyNewLogin({ userId, tenantId, deviceInfo, location, ipAddress }) {
  return createNotification({
    userId,
    tenantId,
    type: 'security',
    title: 'New Login Detected',
    message: `New login from ${deviceInfo}${location ? ' in ' + location : ''}. Was this you?`,
    actionUrl: '/dashboard/settings/security',
    metadata: { deviceInfo, location, ipAddress }
  });
}

/**
 * Notify user of a promotional offer
 */
async function notifyPromotion({ userId, tenantId, title, description, discountPercent, promoCode, expiresAt }) {
  return createNotification({
    userId,
    tenantId,
    type: 'promo',
    title: title || 'Special Offer',
    message: description || `Get ${discountPercent}% off! Use code ${promoCode}`,
    actionUrl: '/dashboard/promotions',
    metadata: { discountPercent, promoCode, expiresAt }
  });
}

/**
 * Notify business owner of a new inquiry
 */
async function notifyNewInquiry({ userId, tenantId, customerName, inquiryType, inquiryId }) {
  return createNotification({
    userId,
    tenantId,
    type: 'inquiry',
    title: 'New Inquiry',
    message: `${customerName} sent you a new ${inquiryType} inquiry.`,
    actionUrl: `/dashboard/inquiries/${inquiryId}`,
    metadata: { customerName, inquiryType, inquiryId }
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
  notifyAdCampaignStatus,
  notifySpecialistBookingConfirmed,
  notifySpecialistBookingDeclined,
  notifyUserFollowed,
  notifyChatRequest,
  notifyChatRequestAccepted,
  notifyNewMessage,
  notifyPoke,
  notifyPostLike,
  notifyPostComment,
  notifyPurchaseConfirmed,
  notifyRefundProcessed,
  notifySubscriptionExpiring,
  notifySubscriptionActivated,
  notifyEmailVerified,
  notifyNewLogin,
  notifyPromotion,
  notifyNewInquiry
};

