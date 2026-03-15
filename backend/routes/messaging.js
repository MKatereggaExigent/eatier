const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// ============================================
// ERLANG-STYLE ACTOR MODEL MESSAGING
// Each conversation is an independent "actor" with its own mailbox
// Messages are passed asynchronously between actors
// ============================================

// ============================================
// POST /api/messaging/request - Request to chat with a user
// ============================================
router.post('/request', async (req, res) => {
  const { recipientId, message } = req.body;
  const requesterId = req.user.userId;
  const tenantId = req.user.tenantId;

  try {
    // Prevent self-request
    if (requesterId === recipientId) {
      return res.status(400).json({ error: 'Cannot send chat request to yourself' });
    }

    // Check if request already exists
    const existingRequest = await pool.query(
      'SELECT id, status FROM chat_requests WHERE requester_id = $1 AND recipient_id = $2',
      [requesterId, recipientId]
    );

    if (existingRequest.rows.length > 0) {
      const status = existingRequest.rows[0].status;
      if (status === 'pending') {
        return res.status(400).json({ error: 'Chat request already pending' });
      }
      if (status === 'accepted') {
        return res.status(400).json({ error: 'Already connected with this user' });
      }
    }

    // Create chat request
    const result = await pool.query(`
      INSERT INTO chat_requests (tenant_id, requester_id, recipient_id, message, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `, [tenantId, requesterId, recipientId, message || null]);

    res.json({
      message: 'Chat request sent successfully',
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating chat request:', error);
    res.status(500).json({ error: 'Failed to send chat request' });
  }
});

// ============================================
// PATCH /api/messaging/request/:requestId - Accept/Decline chat request
// ============================================
router.patch('/request/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body; // 'accepted' or 'declined'
  const userId = req.user.userId;

  try {
    // Verify user is the recipient
    const request = await pool.query(
      'SELECT * FROM chat_requests WHERE id = $1 AND recipient_id = $2',
      [requestId, userId]
    );

    if (request.rows.length === 0) {
      return res.status(404).json({ error: 'Chat request not found' });
    }

    if (request.rows[0].status !== 'pending') {
      return res.status(400).json({ error: 'Request already processed' });
    }

    // Update request status
    await pool.query(
      'UPDATE chat_requests SET status = $1, responded_at = NOW() WHERE id = $2',
      [status, requestId]
    );

    // If accepted, create a conversation (actor)
    if (status === 'accepted') {
      const requestData = request.rows[0];
      
      // Create conversation actor
      const conversation = await pool.query(`
        INSERT INTO chat_conversations (tenant_id, conversation_type, created_by, last_message_at)
        VALUES ($1, 'direct', $2, NOW())
        RETURNING *
      `, [requestData.tenant_id, requestData.requester_id]);

      const conversationId = conversation.rows[0].id;

      // Add both users as participants (actors in the conversation)
      await pool.query(`
        INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
        VALUES 
          ($1, $2, 'member', NOW()),
          ($1, $3, 'member', NOW())
      `, [conversationId, requestData.requester_id, requestData.recipient_id]);

      res.json({
        message: 'Chat request accepted',
        conversation: conversation.rows[0]
      });
    } else {
      res.json({ message: 'Chat request declined' });
    }

  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

// ============================================
// GET /api/messaging/requests - Get pending chat requests
// ============================================
router.get('/requests', async (req, res) => {
  const userId = req.user.userId;
  const type = req.query.type || 'received'; // 'received' or 'sent'

  try {
    const column = type === 'received' ? 'recipient_id' : 'requester_id';
    const otherColumn = type === 'received' ? 'requester_id' : 'recipient_id';

    const result = await pool.query(`
      SELECT 
        cr.*,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image_url
      FROM chat_requests cr
      JOIN users u ON cr.${otherColumn} = u.id
      WHERE cr.${column} = $1 AND cr.status = 'pending'
      ORDER BY cr.created_at DESC
    `, [userId]);

    res.json({ requests: result.rows });

  } catch (error) {
    console.error('Error getting chat requests:', error);
    res.status(500).json({ error: 'Failed to get chat requests' });
  }
});

// ============================================
// GET /api/messaging/conversations - Get user's conversations
// Each conversation is an actor with its own state
// ============================================
router.get('/conversations', async (req, res) => {
  const userId = req.user.userId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const result = await pool.query(`
      SELECT
        c.*,
        cp.unread_count,
        cp.last_read_at,
        cp.is_muted,
        cp.is_archived,
        (
          SELECT json_agg(json_build_object(
            'user_id', u.id,
            'first_name', u.first_name,
            'last_name', u.last_name,
            'email', u.email,
            'profile_image_url', u.profile_image_url
          ))
          FROM chat_participants cp2
          JOIN users u ON cp2.user_id = u.id
          WHERE cp2.conversation_id = c.id AND cp2.user_id != $1
        ) as participants,
        (
          SELECT json_build_object(
            'content', cm.content,
            'sender_id', cm.sender_id,
            'created_at', cm.created_at,
            'message_type', cm.message_type
          )
          FROM chat_messages cm
          WHERE cm.conversation_id = c.id
          ORDER BY cm.created_at DESC
          LIMIT 1
        ) as last_message
      FROM chat_conversations c
      JOIN chat_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = $1 AND c.is_active = true
      ORDER BY c.last_message_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({ conversations: result.rows });

  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

// ============================================
// POST /api/messaging/conversations/:conversationId/messages
// Send a message to a conversation (Erlang message passing)
// ============================================
router.post('/conversations/:conversationId/messages', async (req, res) => {
  const { conversationId } = req.params;
  const { content, messageType, attachments, replyToMessageId } = req.body;
  const senderId = req.user.userId;

  try {
    // Verify user is a participant in this conversation
    const participant = await pool.query(
      'SELECT id FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, senderId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Insert message into the conversation's mailbox
    const message = await pool.query(`
      INSERT INTO chat_messages (
        conversation_id,
        sender_id,
        message_type,
        content,
        attachments,
        reply_to_message_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      conversationId,
      senderId,
      messageType || 'text',
      content.trim(),
      JSON.stringify(attachments || []),
      replyToMessageId || null
    ]);

    // Update conversation's last_message_at
    await pool.query(
      'UPDATE chat_conversations SET last_message_at = NOW() WHERE id = $1',
      [conversationId]
    );

    // Increment unread count for other participants
    await pool.query(`
      UPDATE chat_participants
      SET unread_count = unread_count + 1
      WHERE conversation_id = $1 AND user_id != $2
    `, [conversationId, senderId]);

    res.json({
      message: 'Message sent successfully',
      data: message.rows[0]
    });

  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ============================================
// GET /api/messaging/conversations/:conversationId/messages
// Retrieve messages from a conversation's mailbox
// ============================================
router.get('/conversations/:conversationId/messages', async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const before = req.query.before; // Timestamp for pagination

  try {
    // Verify user is a participant
    const participant = await pool.query(
      'SELECT id FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    if (participant.rows.length === 0) {
      return res.status(403).json({ error: 'Not a participant in this conversation' });
    }

    // Build query
    let query = `
      SELECT
        cm.*,
        u.first_name as sender_first_name,
        u.last_name as sender_last_name,
        u.profile_image_url as sender_avatar,
        (
          SELECT json_agg(json_build_object(
            'user_id', cmr.user_id,
            'read_at', cmr.read_at
          ))
          FROM chat_message_reads cmr
          WHERE cmr.message_id = cm.id
        ) as read_by
      FROM chat_messages cm
      JOIN users u ON cm.sender_id = u.id
      WHERE cm.conversation_id = $1 AND cm.is_deleted = false
    `;

    const params = [conversationId];

    if (before) {
      query += ` AND cm.created_at < $${params.length + 1}`;
      params.push(before);
    }

    query += ` ORDER BY cm.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Mark messages as read
    await pool.query(`
      INSERT INTO chat_message_reads (message_id, user_id, read_at)
      SELECT id, $1, NOW()
      FROM chat_messages
      WHERE conversation_id = $2
        AND sender_id != $1
        AND id NOT IN (
          SELECT message_id FROM chat_message_reads WHERE user_id = $1
        )
      ON CONFLICT (message_id, user_id) DO NOTHING
    `, [userId, conversationId]);

    // Reset unread count for this user
    await pool.query(
      'UPDATE chat_participants SET unread_count = 0, last_read_at = NOW() WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );

    res.json({ messages: result.rows.reverse() }); // Reverse to show oldest first

  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

module.exports = router;

