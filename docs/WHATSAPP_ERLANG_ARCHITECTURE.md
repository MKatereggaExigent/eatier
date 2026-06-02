# WhatsApp-Style Messaging Architecture (Erlang Actor Model)

## 🎯 **Overview**

This document explains how the Itiyum messaging system implements WhatsApp's Erlang-inspired architecture with:
- **Supervisors** for fault tolerance
- **Actors (Conversations)** with independent mailboxes
- **Message Queues** for asynchronous delivery
- **Listeners** for real-time events

---

## 📚 **WhatsApp's Erlang Architecture**

WhatsApp uses Erlang/OTP (Open Telecom Platform) with these core principles:

### **1. Actor Model**
- Each conversation is an independent "actor" (process)
- Actors communicate via message passing (no shared state)
- Each actor has its own mailbox (message queue)

### **2. Supervisor Trees**
- Supervisors monitor child processes
- Automatic restart on failure (fault tolerance)
- Hierarchical supervision (supervisor of supervisors)

### **3. Message Passing**
- Asynchronous, non-blocking communication
- Messages delivered to mailboxes
- Actors process messages sequentially from their mailbox

### **4. Let It Crash Philosophy**
- Don't try to handle every error
- Let processes crash and restart cleanly
- Supervisors handle recovery

---

## 🏗️ **Itiyum Implementation (Node.js + WebSockets)**

### **Architecture Diagram**

```
┌──────────────────────────────────────────────────────────────┐
│                     SUPERVISOR LAYER                         │
│  (WebSocket Server + Database Connection Pool)              │
└────────────┬─────────────────────────────────────────────────┘
             │
             ├─── Conversation Actor 1 (Mailbox: chat_messages)
             │    ├─── Participant Listener (User A)
             │    └─── Participant Listener (User B)
             │
             ├─── Conversation Actor 2 (Mailbox: chat_messages)
             │    ├─── Participant Listener (User C)
             │    └─── Participant Listener (User D)
             │
             └─── Presence Manager (Actor)
                  ├─── User A (online)
                  ├─── User B (away)
                  └─── User C (offline)
```

---

## 🔧 **Implementation Details**

### **1. SUPERVISOR: WebSocket Server** (`backend/websocket/socketHandler.js`)

```javascript
function initializeWebSocket(server) {
  const io = socketIo(server, {
    cors: { origin: process.env.FRONTEND_URL }
  });

  // SUPERVISOR: Monitor all connections
  io.on('connection', (socket) => {
    // Each socket is a "process" in Erlang terms
    socket.join(`user:${socket.userId}`);  // User's personal room
    updateUserPresence(socket.userId, 'online');  // Update state

    // LISTENER: Handle disconnect and restart
    socket.on('disconnect', () => {
      setTimeout(() => {
        // Grace period for reconnection (fault tolerance)
        if (noActiveConnections(socket.userId)) {
          updateUserPresence(socket.userId, 'offline');
        }
      }, 5000);
    });
  });
}
```

**Key Features:**
- ✅ **Fault Tolerance:** 5-second grace period for reconnection
- ✅ **Process Isolation:** Each socket is independent
- ✅ **State Management:** User presence tracked separately

---

### **2. ACTOR: Conversation (Mailbox Pattern)** (`backend/routes/messaging.js`)

```javascript
// Each conversation is an ACTOR with its own mailbox
router.post('/conversations/:conversationId/messages', async (req, res) => {
  const { conversationId } = req.params;
  const { content } = req.body;
  const senderId = req.user.userId;

  // 1. VERIFY PARTICIPANT (Access Control)
  const participant = await pool.query(
    'SELECT id FROM chat_participants WHERE conversation_id = $1 AND user_id = $2',
    [conversationId, senderId]
  );

  if (participant.rows.length === 0) {
    return res.status(403).json({ error: 'Not a participant' });
  }

  // 2. INSERT INTO MAILBOX (Message Queue)
  const message = await pool.query(`
    INSERT INTO chat_messages (conversation_id, sender_id, content)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [conversationId, senderId, content]);

  // 3. EMIT TO LISTENERS (Asynchronous Broadcast)
  emitNewMessage(conversationId, message.rows[0]);

  res.json({ message: 'Message sent successfully' });
});
```

**Erlang Equivalent:**
```erlang
% Send message to conversation actor
ConversationPid ! {new_message, SenderId, Content}.

% Conversation actor receives from mailbox
receive
  {new_message, SenderId, Content} ->
    store_message(ConversationId, SenderId, Content),
    notify_participants(ConversationId, Message)
end.
```

---

### **3. MESSAGE QUEUE: Database Tables**

**Tables as Mailboxes:**

| Table | Purpose | Erlang Equivalent |
|-------|---------|-------------------|
| `chat_messages` | Conversation mailbox | Actor's message queue |
| `chat_requests` | Pending connection requests | Supervisor's task queue |
| `typing_indicators` | Ephemeral state | Short-lived actor state |
| `user_presence` | Online status | Presence actor state |

**Example: chat_messages as Mailbox**
```sql
-- Each conversation_id is an actor's mailbox
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID,  -- ← Actor ID (mailbox identifier)
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMP,
  -- Messages are ordered by created_at (FIFO queue)
  INDEX idx_conversation_messages (conversation_id, created_at)
);
```

---

### **4. LISTENERS: WebSocket Rooms** (`backend/websocket/socketHandler.js`)

```javascript
// User joins conversation room (becomes a listener)
socket.on('join:conversation', async (conversationId) => {
  // Verify participant status
  const isParticipant = await checkParticipant(conversationId, socket.userId);
  
  if (isParticipant) {
    socket.join(`conversation:${conversationId}`);  // ← LISTENER REGISTERED
  }
});

// Emit to all listeners in the room
function emitNewMessage(conversationId, message) {
  io.to(`conversation:${conversationId}`).emit('message:new', message);
}
```

**Erlang Equivalent:**
```erlang
% Register listener (subscriber)
ConversationPid ! {subscribe, UserPid}.

% Broadcast to all subscribers
lists:foreach(
  fun(Subscriber) -> Subscriber ! {new_message, Message} end,
  Subscribers
).
```

---

## 🔄 **Message Flow (WhatsApp-Style)**

### **Sending a Message**

```
┌─────────┐         ┌──────────────┐         ┌──────────────┐         ┌─────────┐
│ User A  │────────▶│   Backend    │────────▶│ Conversation │────────▶│ User B  │
│(Client) │ HTTP    │    (REST)    │ Enqueue │    Actor     │ WebSocket│(Listener)│
└─────────┘         └──────────────┘         └──────────────┘         └─────────┘
     │                      │                        │                      │
     │ 1. POST /messages    │                        │                      │
     ├─────────────────────▶│                        │                      │
     │                      │                        │                      │
     │                      │ 2. Insert into mailbox │                      │
     │                      ├───────────────────────▶│                      │
     │                      │    (chat_messages)     │                      │
     │                      │                        │                      │
     │                      │                        │ 3. Emit to listeners │
     │                      │                        ├─────────────────────▶│
     │                      │                        │    (WebSocket)       │
     │                      │                        │                      │
     │   200 OK             │                        │                      │
     │◀─────────────────────┤                        │                      │
```

### **Step-by-Step:**

1. **HTTP Request:** User A sends message via REST API
2. **Validation:** Backend verifies User A is a participant
3. **Enqueue:** Message inserted into conversation's mailbox (database)
4. **Broadcast:** WebSocket emits to all listeners (participants) in real-time
5. **Acknowledgment:** HTTP 200 OK returned to sender

**Erlang Equivalent:**
```erlang
% User A sends message
ConversationPid ! {new_message, SenderId, Content}.

% Conversation actor processes message
receive
  {new_message, SenderId, Content} ->
    % 1. Store in mailbox (persistent storage)
    MessageId = db:insert(ConversationId, SenderId, Content),

    % 2. Notify all participants (subscribers)
    Participants = db:get_participants(ConversationId),
    lists:foreach(
      fun(Participant) ->
        Participant ! {message_received, MessageId, Content}
      end,
      Participants
    )
end.
```

---

## 🛡️ **Fault Tolerance (Supervisor Pattern)**

### **WhatsApp's Approach:**
```
Supervisor (WhatsApp Server)
  ├─── Worker Pool (Message Handlers)
  │    ├─── Worker 1 (crashes → restart)
  │    ├─── Worker 2 (healthy)
  │    └─── Worker 3 (healthy)
  │
  └─── Conversation Supervisors
       ├─── Conversation 1 Actor
       ├─── Conversation 2 Actor (crashes → restart)
       └─── Conversation 3 Actor
```

### **Itiyum's Implementation:**

**1. WebSocket Reconnection (Client-Side Fault Tolerance)**
```typescript
// src/app/core/services/websocket.service.ts
connect(): void {
  const token = localStorage.getItem('itiyum_token');

  this.socket = io(environment.socketUrl, {
    auth: { token },
    reconnection: true,           // ✅ Auto-reconnect
    reconnectionAttempts: 5,       // ✅ Max retries
    reconnectionDelay: 1000        // ✅ Exponential backoff
  });

  this.socket.on('connect_error', () => {
    this.reconnectAttempts++;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.disconnect();
    }
  });
}
```

**2. Database Connection Pool (Server-Side Supervision)**
```javascript
// backend/config/database.js
const pool = new Pool({
  max: 20,                    // ✅ Max connections (worker pool)
  connectionTimeoutMillis: 5000,  // ✅ Timeout per connection
  idleTimeoutMillis: 30000        // ✅ Idle connection cleanup
});

// Auto-retry on connection failure
pool.on('error', (err, client) => {
  console.error('Database error:', err);
  // Pool automatically creates new connection (supervisor restart)
});
```

**3. Grace Period for Disconnection**
```javascript
// backend/websocket/socketHandler.js
socket.on('disconnect', async () => {
  // Don't immediately mark as offline (WhatsApp does this too!)
  setTimeout(async () => {
    const sockets = await io.in(`user:${socket.userId}`).fetchSockets();
    if (sockets.length === 0) {
      // User truly disconnected (no other tabs/devices)
      await updateUserPresence(socket.userId, 'offline');
    }
  }, 5000); // ✅ 5-second grace period
});
```

---

## 📊 **Performance Optimizations (WhatsApp-Style)**

### **1. Message Pagination (Lazy Loading)**
```javascript
// Only load recent messages, not entire history
router.get('/conversations/:conversationId/messages', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;   // ✅ Default 50 messages
  const before = req.query.before;                 // ✅ Cursor-based pagination

  const query = `
    SELECT * FROM chat_messages
    WHERE conversation_id = $1
      AND created_at < $2
    ORDER BY created_at DESC
    LIMIT $3
  `;

  const result = await pool.query(query, [conversationId, before, limit]);
});
```

**WhatsApp does the same:**
- Loads ~50 most recent messages
- Older messages fetched on scroll (lazy loading)
- Cursor-based pagination (efficient for large datasets)

---

### **2. Typing Indicators (Ephemeral State)**
```javascript
// Typing indicators expire after 10 seconds (no permanent storage)
router.post('/conversations/:conversationId/typing', async (req, res) => {
  const { isTyping } = req.body;

  if (isTyping) {
    await pool.query(`
      INSERT INTO typing_indicators (conversation_id, user_id, expires_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '10 seconds')
      ON CONFLICT (conversation_id, user_id)
      DO UPDATE SET expires_at = CURRENT_TIMESTAMP + INTERVAL '10 seconds'
    `, [conversationId, userId]);
  } else {
    // Remove indicator immediately when user stops typing
    await pool.query(
      'DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2',
      [conversationId, userId]
    );
  }
});
```

**WhatsApp's Approach:**
- Typing indicators are **not stored permanently**
- Expire automatically (10 seconds of inactivity)
- Broadcast via WebSocket (no database needed for real-time state)

---

### **3. Presence Updates (Heartbeat)**
```javascript
// Client sends heartbeat every 30 seconds
router.post('/presence/heartbeat', async (req, res) => {
  await pool.query(`
    UPDATE user_presence
    SET last_activity = CURRENT_TIMESTAMP
    WHERE user_id = $1
  `, [userId]);
});

// Server marks as "away" if no heartbeat for 5 minutes
setInterval(async () => {
  await pool.query(`
    UPDATE user_presence
    SET status = 'away'
    WHERE last_activity < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
      AND status = 'online'
  `);
}, 60000); // Check every 1 minute
```

---

## 🚀 **Scalability (WhatsApp Handles 2 Billion Users!)**

### **WhatsApp's Approach:**
1. **Sharding:** Conversations distributed across multiple servers
2. **Caching:** Redis for online presence and typing indicators
3. **Message Queue:** Kafka/RabbitMQ for async delivery
4. **Load Balancing:** HAProxy/Nginx distributes WebSocket connections

### **Itiyum's Scaling Path:**

**Phase 1 (Current):**
- ✅ Single Node.js server
- ✅ PostgreSQL database
- ✅ WebSocket for real-time

**Phase 2 (10K+ Users):**
- Add Redis for presence/typing indicators
- Implement sticky sessions for WebSocket load balancing
- Database read replicas

**Phase 3 (100K+ Users):**
- Horizontal scaling with Kubernetes
- Message queue (Redis Pub/Sub or RabbitMQ)
- Database sharding by tenant_id

**Phase 4 (1M+ Users):**
- Multi-region deployment
- CDN for media files
- Dedicated WebSocket servers

---

## 📋 **Key Takeaways**

| WhatsApp (Erlang) | Itiyum (Node.js) | Implementation |
|-------------------|------------------|----------------|
| Actor (Process) | Conversation | Database table + WebSocket room |
| Mailbox | `chat_messages` table | PostgreSQL with indexes |
| Supervisor | WebSocket server | Socket.IO + connection pool |
| Message Passing | `Pid ! Message` | `io.to(room).emit()` |
| Fault Tolerance | Process restart | Reconnection + grace period |
| Let It Crash | Supervisor restart | Database pool auto-recovery |

---

## ✅ **Verification**

**To confirm the architecture is working:**

1. **Test Asynchronous Messaging:**
   - Send message from User A
   - User B receives instantly (WebSocket)
   - Message persists in database (mailbox)

2. **Test Fault Tolerance:**
   - Disconnect User A
   - User A reconnects within 5 seconds
   - Status remains "online" (grace period)

3. **Test Typing Indicators:**
   - User A starts typing
   - User B sees "User A is typing..."
   - Indicator disappears after 10 seconds

4. **Test Presence:**
   - User goes offline
   - After 5 seconds, status updates to "offline"
   - Other users see presence change

---

**This architecture closely mirrors WhatsApp's design! 🎉**


