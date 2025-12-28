const express = require('express');
const router = express.Router();
const chatService = require('../services/chatService');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Rate limiting map (simple in-memory rate limiting)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;
const MAX_PUBLIC_REQUESTS_PER_WINDOW = 5; // Stricter limit for public users

/**
 * Simple rate limiting middleware
 */
function rateLimiter(req, res, next) {
  const userId = req.user?.id || req.ip;
  const now = Date.now();

  if (!rateLimitMap.has(userId)) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const userLimit = rateLimitMap.get(userId);

  if (now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }

  if (userLimit.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a moment before trying again.'
    });
  }

  userLimit.count++;
  next();
}

/**
 * Sanitize user input
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove any potential script tags or malicious content
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .trim()
    .substring(0, 2000); // Limit length
}

/**
 * POST /api/chat/public
 * Send a message to the AI chatbot for PUBLIC (unauthenticated) users
 * Only provides information from public pages content
 */
router.post('/public', rateLimiter, async (req, res) => {
  try {
    const { message, pageContext } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeInput(message);

    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Generate AI response with PUBLIC context only (no database access)
    const aiResponse = await chatService.generatePublicResponse(
      sanitizedMessage,
      pageContext || {}
    );

    res.json({
      response: aiResponse,
      context: {
        pageName: pageContext?.pageName,
        isPublic: true
      }
    });

  } catch (error) {
    console.error('Error in public chat endpoint:', error);

    if (error.message.includes('OpenAI')) {
      return res.status(503).json({
        error: 'AI service is temporarily unavailable. Please try again later.'
      });
    }

    res.status(500).json({
      error: 'Failed to process your message. Please try again.'
    });
  }
});

/**
 * POST /api/chat
 * Send a message to the AI chatbot
 * REQUIRES AUTHENTICATION - Each user only sees their own data based on RBAC and multi-tenancy
 */
router.post('/', authenticateToken, rateLimiter, async (req, res) => {
  try {
    const { message, pageContext } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Sanitize user input
    const sanitizedMessage = sanitizeInput(message);

    if (!sanitizedMessage) {
      return res.status(400).json({ error: 'Invalid message' });
    }

    // Get user ID and tenant ID from authenticated user
    // SECURITY: Never use default/admin user - always require authentication
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get page context data
    const contextData = await chatService.getPageContext(userId, tenantId, pageContext || {});

    // Generate AI response with RAG (Retrieval-Augmented Generation)
    const aiResponse = await chatService.generateResponse(
      sanitizedMessage,
      pageContext || {},
      contextData,
      userId,
      tenantId
    );

    // Save chat history
    await chatService.saveChatMessage(userId, tenantId, sanitizedMessage, false);
    await chatService.saveChatMessage(userId, tenantId, aiResponse, true);

    res.json({
      response: aiResponse,
      context: {
        pageName: pageContext?.pageName,
        userRole: contextData.user?.role
      }
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);

    if (error.message.includes('OpenAI')) {
      return res.status(503).json({
        error: 'AI service is temporarily unavailable. Please try again later.'
      });
    }

    res.status(500).json({
      error: 'Failed to process your message. Please try again.'
    });
  }
});

/**
 * GET /api/chat/history
 * Get chat history for the current user
 * REQUIRES AUTHENTICATION - Each user only sees their own history
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    // Get user ID and tenant ID from authenticated user
    // SECURITY: Never use default/admin user
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = parseInt(req.query.limit) || 20;
    const history = await chatService.getChatHistory(userId, tenantId, limit);

    res.json({ history });

  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

/**
 * DELETE /api/chat/history
 * Clear chat history for the current user
 * REQUIRES AUTHENTICATION - Each user can only clear their own history
 */
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    // Get user ID and tenant ID from authenticated user
    // SECURITY: Never use default/admin user
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;

    if (!userId || !tenantId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await pool.query(`
      DELETE FROM chat_history
      WHERE user_id = $1 AND tenant_id = $2
    `, [userId, tenantId]);

    res.json({ message: 'Chat history cleared successfully' });

  } catch (error) {
    console.error('Error clearing chat history:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

module.exports = router;

