const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

let io;

/**
 * Initialize WebSocket server
 */
function initializeWebSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:4200',
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/socket.io/'
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      socket.tenantId = decoded.tenantId;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Update user presence to online
    updateUserPresence(socket.userId, socket.tenantId, 'online');

    // Handle joining conversation rooms
    socket.on('join:conversation', async (conversationId) => {
      try {
        // Verify user is a participant
        const participant = await pool.query(
          'SELECT id FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
          [conversationId, socket.userId]
        );

        if (participant.rows.length > 0) {
          socket.join(`conversation:${conversationId}`);
          console.log(`User ${socket.userId} joined conversation ${conversationId}`);
        }
      } catch (error) {
        console.error('Error joining conversation:', error);
      }
    });

    // Handle leaving conversation rooms
    socket.on('leave:conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.userId} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing:start', async (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user:typing', {
        userId: socket.userId,
        conversationId
      });
    });

    socket.on('typing:stop', async (conversationId) => {
      socket.to(`conversation:${conversationId}`).emit('user:stopped-typing', {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle presence updates
    socket.on('presence:update', async (status) => {
      await updateUserPresence(socket.userId, socket.tenantId, status);
      
      // Broadcast to followers/following
      const connections = await getConnectedUsers(socket.userId, socket.tenantId);
      connections.forEach(userId => {
        io.to(`user:${userId}`).emit('presence:changed', {
          userId: socket.userId,
          status
        });
      });
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`❌ User disconnected: ${socket.userId}`);
      
      // Update presence to offline after a delay (in case of reconnection)
      setTimeout(async () => {
        const sockets = await io.in(`user:${socket.userId}`).fetchSockets();
        if (sockets.length === 0) {
          await updateUserPresence(socket.userId, socket.tenantId, 'offline');
          
          // Notify connections
          const connections = await getConnectedUsers(socket.userId, socket.tenantId);
          connections.forEach(userId => {
            io.to(`user:${userId}`).emit('presence:changed', {
              userId: socket.userId,
              status: 'offline'
            });
          });
        }
      }, 5000); // 5 second grace period
    });
  });

  return io;
}

/**
 * Update user presence in database
 */
async function updateUserPresence(userId, tenantId, status) {
  try {
    await pool.query(`
      INSERT INTO user_presence (tenant_id, user_id, status, last_seen, last_activity)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id, user_id)
      DO UPDATE SET
        status = EXCLUDED.status,
        last_seen = CURRENT_TIMESTAMP,
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `, [tenantId, userId, status]);
  } catch (error) {
    console.error('Error updating presence:', error);
  }
}

/**
 * Get list of connected users (followers/following)
 */
async function getConnectedUsers(userId, tenantId) {
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        CASE
          WHEN follower_id = $1 THEN following_id
          ELSE follower_id
        END as user_id
      FROM followers
      WHERE tenant_id = $2
        AND (follower_id = $1 OR following_id = $1)
    `, [userId, tenantId]);

    return result.rows.map(row => row.user_id);
  } catch (error) {
    console.error('Error getting connected users:', error);
    return [];
  }
}

/**
 * Emit new message to conversation participants
 */
function emitNewMessage(conversationId, message) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message:new', message);
  }
}

/**
 * Emit new poke notification
 */
function emitPoke(userId, poke) {
  if (io) {
    io.to(`user:${userId}`).emit('poke:received', poke);
  }
}

/**
 * Emit message reaction
 */
function emitReaction(conversationId, messageId, reaction) {
  if (io) {
    io.to(`conversation:${conversationId}`).emit('message:reaction', {
      messageId,
      reaction
    });
  }
}

module.exports = {
  initializeWebSocket,
  emitNewMessage,
  emitPoke,
  emitReaction
};

