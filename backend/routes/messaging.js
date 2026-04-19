const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { emitNewMessage, emitReaction } = require('../websocket/socketHandler');

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
  const tenantId = req.user.tenant_id;

  // LOG EVERYTHING for debugging
  console.log('🔍 Chat request received:');
  console.log('  Request body:', JSON.stringify(req.body));
  console.log('  recipientId:', recipientId, 'Type:', typeof recipientId);
  console.log('  requesterId:', requesterId);
  console.log('  tenantId:', tenantId);

  try {
    // Validate recipientId
    if (!recipientId) {
      console.log('❌ Recipient ID is missing!');
      return res.status(400).json({ error: 'Recipient ID is required' });
    }

    // Prevent self-request
    if (requesterId === recipientId) {
      return res.status(400).json({ error: 'Cannot send chat request to yourself' });
    }

    // Verify recipient exists
    const recipientCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [recipientId]
    );

    if (recipientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipient not found' });
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

    // Auto-follow: If not already following, create follow relationship
    const followCheck = await pool.query(
      'SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2',
      [requesterId, recipientId]
    );

    if (followCheck.rows.length === 0) {
      console.log('📌 Auto-following user:', recipientId);
      await pool.query(
        'INSERT INTO user_follows (follower_id, following_id, tenant_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [requesterId, recipientId, tenantId]
      );
    }

    // Create chat request
    const result = await pool.query(`
      INSERT INTO chat_requests (tenant_id, requester_id, recipient_id, message, status)
      VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *
    `, [tenantId, requesterId, recipientId, message || null]);

    res.json({
      message: 'Chat request sent successfully',
      request: result.rows[0],
      autoFollowed: followCheck.rows.length === 0
    });

  } catch (error) {
    console.error('Error creating chat request:', error);
    console.error('Request body:', req.body);
    console.error('User info:', { userId: req.user.userId, tenantId: req.user.tenant_id });
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

    // PUBLIC: Allow chat requests from anyone (cross-tenant allowed for social networking)
    const result = await pool.query(`
      SELECT
        cr.*,
        u.first_name,
        u.last_name,
        u.email,
        COALESCE(u.avatar_url, u.profile_photo) as profile_image_url
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
    // PUBLIC: Show all conversations (cross-tenant allowed for social networking)
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
            'profile_image_url', COALESCE(u.avatar_url, u.profile_photo)
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
  const { content, messageType, attachments, replyToMessageId, fileUrl, fileName, fileType, fileSize } = req.body;
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

    // Allow empty content if file is attached
    if ((!content || !content.trim()) && !fileUrl) {
      return res.status(400).json({ error: 'Message content or file is required' });
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
      messageType || (fileUrl ? 'file' : 'text'),
      content ? content.trim() : (fileName || 'File attachment'),
      JSON.stringify(attachments || []),
      replyToMessageId || null
    ]);

    // If file is attached, create message_file record
    if (fileUrl && fileName) {
      await pool.query(`
        INSERT INTO message_files (
          message_id,
          file_name,
          file_type,
          file_size,
          file_url,
          upload_status
        )
        VALUES ($1, $2, $3, $4, $5, 'completed')
      `, [
        message.rows[0].id,
        fileName,
        fileType || 'application/octet-stream',
        fileSize || 0,
        fileUrl
      ]);
    }

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

    // Emit WebSocket event for real-time delivery
    emitNewMessage(conversationId, message.rows[0]);

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
        COALESCE(u.avatar_url, u.profile_photo) as sender_avatar,
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

// ============================================
// POST /api/messaging/conversations/:conversationId/typing
// Set typing indicator
// ============================================
router.post('/conversations/:conversationId/typing', async (req, res) => {
  const { conversationId } = req.params;
  const { isTyping } = req.body;
  const userId = req.user.userId;

  try {
    if (isTyping) {
      // Upsert typing indicator
      await pool.query(`
        INSERT INTO typing_indicators (conversation_id, user_id, is_typing, started_at, expires_at)
        VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '10 seconds')
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET
          is_typing = true,
          started_at = CURRENT_TIMESTAMP,
          expires_at = CURRENT_TIMESTAMP + INTERVAL '10 seconds'
      `, [conversationId, userId]);
    } else {
      // Remove typing indicator
      await pool.query(
        'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
        [conversationId, userId]
      );
    }

    res.json({ message: 'Typing indicator updated' });

  } catch (error) {
    console.error('Error updating typing indicator:', error);
    res.status(500).json({ error: 'Failed to update typing indicator' });
  }
});

// ============================================
// GET /api/messaging/conversations/:conversationId/typing
// Get who is typing in a conversation
// ============================================
router.get('/conversations/:conversationId/typing', async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;

  try {
    const result = await pool.query(`
      SELECT
        ti.user_id,
        u.first_name,
        u.last_name
      FROM typing_indicators ti
      JOIN users u ON ti.user_id = u.id
      WHERE ti.conversation_id = $1
        AND ti.user_id != $2
        AND ti.is_typing = true
        AND ti.expires_at > CURRENT_TIMESTAMP
    `, [conversationId, userId]);

    res.json({ typing_users: result.rows });

  } catch (error) {
    console.error('Error fetching typing indicators:', error);
    res.status(500).json({ error: 'Failed to fetch typing indicators' });
  }
});

// ============================================
// POST /api/messaging/messages/:messageId/react
// Add a reaction to a message
// ============================================
router.post('/messages/:messageId/react', async (req, res) => {
  const { messageId } = req.params;
  const { reaction } = req.body;
  const userId = req.user.userId;

  try {
    if (!reaction || reaction.trim().length === 0) {
      return res.status(400).json({ error: 'Reaction is required' });
    }

    // Upsert reaction
    const result = await pool.query(`
      INSERT INTO message_reactions (message_id, user_id, reaction)
      VALUES ($1, $2, $3)
      ON CONFLICT (message_id, user_id, reaction)
      DO NOTHING
      RETURNING *
    `, [messageId, userId, reaction.trim()]);

    // Emit WebSocket event
    if (result.rows[0]) {
      emitReaction(null, messageId, result.rows[0]);
    }

    res.json({
      message: 'Reaction added',
      reaction: result.rows[0]
    });

  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// ============================================
// DELETE /api/messaging/messages/:messageId/react
// Remove a reaction from a message
// ============================================
router.delete('/messages/:messageId/react', async (req, res) => {
  const { messageId } = req.params;
  const { reaction } = req.body;
  const userId = req.user.userId;

  try {
    await pool.query(
      'DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND reaction = $3',
      [messageId, userId, reaction]
    );

    res.json({ message: 'Reaction removed' });

  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// ============================================
// GET /api/messaging/messages/:messageId/reactions
// Get all reactions for a message
// ============================================
router.get('/messages/:messageId/reactions', async (req, res) => {
  const { messageId } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        mr.reaction,
        COUNT(*) as count,
        json_agg(json_build_object(
          'user_id', u.id,
          'first_name', u.first_name,
          'last_name', u.last_name
        )) as users
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = $1
      GROUP BY mr.reaction
    `, [messageId]);

    res.json({ reactions: result.rows });

  } catch (error) {
    console.error('Error fetching reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
});

module.exports = router;

