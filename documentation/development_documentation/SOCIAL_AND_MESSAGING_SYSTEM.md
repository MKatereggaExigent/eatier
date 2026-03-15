# Social and Messaging System Implementation

## Overview
This document describes the implementation of the Social (Follow/Following) and Messaging (Chat) systems in the Itiyum platform, built using Erlang-style Actor Model principles.

## Architecture

### Erlang Actor Model Principles
The messaging system is inspired by Erlang's actor model:
- **Actors**: Each conversation is an independent actor with its own state
- **Mailbox**: Messages are stored in a mailbox (chat_messages table) for each conversation
- **Message Passing**: Asynchronous message passing between actors (users)
- **Process Isolation**: Each conversation operates independently
- **No Shared State**: Actors communicate only through messages

## Database Schema

### Migration: `037_social_and_messaging_system.sql`

#### 1. **user_follows** - Social Graph
```sql
- follower_id: User who is following
- following_id: User being followed
- tenant_id: Multi-tenancy support
- Constraints: No self-follow, unique relationships
```

#### 2. **chat_conversations** - Actor Mailboxes
```sql
- id: Conversation actor ID
- conversation_type: 'direct' or 'group'
- tenant_id: Multi-tenancy support
- last_message_at: For sorting conversations
- is_active: Soft delete support
```

#### 3. **chat_participants** - Actor Membership
```sql
- conversation_id: Which actor/conversation
- user_id: Which user is a participant
- unread_count: Track unread messages per user
- last_read_at: When user last read messages
- is_muted, is_archived: User preferences
```

#### 4. **chat_messages** - Messages in Mailbox
```sql
- conversation_id: Which conversation's mailbox
- sender_id: Who sent the message
- content: Message text
- message_type: 'text', 'image', 'file', 'system'
- attachments: JSON array of file URLs
- reply_to_message_id: For threaded conversations
- is_edited, is_deleted: Message lifecycle
```

#### 5. **chat_message_reads** - Delivery Tracking
```sql
- message_id: Which message was read
- user_id: Who read it
- read_at: When it was read
- Implements Erlang's "receive acknowledgment" pattern
```

#### 6. **chat_requests** - Connection Management
```sql
- requester_id: Who wants to chat
- recipient_id: Who receives the request
- status: 'pending', 'accepted', 'declined'
- message: Optional introduction message
```

## API Endpoints

### Social Features (`/api/social`)

#### Follow User
```
POST /api/social/follow/:userId
- Creates follow relationship
- Sends notification to followed user
- Enforces multi-tenancy and RBAC
```

#### Unfollow User
```
DELETE /api/social/follow/:userId
- Removes follow relationship
```

#### Get Followers
```
GET /api/social/followers?userId=xxx&limit=50&offset=0
- Returns list of users following the specified user
- Includes user profile information
```

#### Get Following
```
GET /api/social/following?userId=xxx&limit=50&offset=0
- Returns list of users the specified user follows
```

### Messaging Features (`/api/messaging`)

#### Request to Chat
```
POST /api/messaging/request
Body: { recipientId, message }
- Creates a chat request
- Prevents duplicate requests
- Enforces no self-requests
```

#### Accept/Decline Chat Request
```
PATCH /api/messaging/request/:requestId
Body: { status: 'accepted' | 'declined' }
- Updates request status
- If accepted, creates a conversation actor
- Adds both users as participants
```

#### Get Chat Requests
```
GET /api/messaging/requests?type=received|sent
- Returns pending chat requests
- Type: 'received' (requests to you) or 'sent' (requests you sent)
```

#### Get Conversations
```
GET /api/messaging/conversations?limit=50&offset=0
- Returns user's active conversations
- Includes participants, last message, unread count
- Sorted by last_message_at
```

#### Send Message
```
POST /api/messaging/conversations/:conversationId/messages
Body: { content, messageType, attachments, replyToMessageId }
- Sends message to conversation's mailbox
- Updates last_message_at
- Increments unread count for other participants
```

#### Get Messages
```
GET /api/messaging/conversations/:conversationId/messages?limit=50&offset=0&before=timestamp
- Retrieves messages from conversation's mailbox
- Marks messages as read
- Resets unread count
- Supports pagination with 'before' timestamp
```

## Multi-Tenancy & RBAC

All endpoints enforce:
- **Multi-tenancy**: All data scoped to `tenant_id`
- **RBAC**: Users can only access their own data
- **Authentication**: All routes require `authenticateToken` middleware

## Notifications

### Social Notifications
- `notifyUserFollowed`: When someone follows you

### Messaging Notifications
- `notifyChatRequest`: When someone requests to chat
- `notifyChatRequestAccepted`: When your chat request is accepted
- `notifyNewMessage`: When you receive a new message

## Next Steps

### Frontend Implementation (Remaining Tasks)
1. **Add Social Features to All Account Types**
   - Client dashboard sidebar
   - Business Owner dashboard sidebar
   - Specialist dashboard sidebar
   - Show followers/following counts
   - Follow/Unfollow buttons

2. **Create Messenger UI Component**
   - Facebook-style chat interface
   - Conversation list with unread badges
   - Message thread view
   - Real-time updates (WebSocket or polling)
   - File attachments support
   - Message reactions and replies

## Deployment Instructions

1. **Run Migration**
```bash
docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < ~/eatier/backend/scripts/migrations/037_social_and_messaging_system.sql
```

2. **Deploy Backend**
```bash
cd ~/eatier
git pull origin development-v2
./deploy_entire_project.sh
```

3. **Verify Endpoints**
```bash
# Test follow endpoint
curl -X POST https://itiyum.com/api/social/follow/USER_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test chat request
curl -X POST https://itiyum.com/api/messaging/request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"recipientId":"USER_ID","message":"Hi!"}'
```

## Technical Notes

- All timestamps use `TIMESTAMP WITH TIME ZONE` for global compatibility
- JSON columns (`metadata`, `attachments`) allow for future extensibility
- Indexes optimized for common queries (conversation list, message retrieval)
- Soft deletes supported via `is_active`, `is_deleted` flags
- Message editing tracked with `is_edited` and `edited_at`

## Frontend Implementation Status ✅

### Services Created
- ✅ `src/app/core/services/social.service.ts` - Social API interactions
- ✅ `src/app/core/services/messaging.service.ts` - Messaging API interactions with Erlang Actor Model

### Components Created
- ✅ `src/app/shared/components/social-widget/` - Reusable social widget
  - Shows followers/following counts
  - Quick access to social features
  - NYT Editorial Design styling
- ✅ `src/app/shared/components/messaging-widget/` - Reusable messaging widget
  - Recent conversations
  - Unread message counts
  - Chat request management
  - Accept/decline requests
- ✅ `src/app/pages/messages/` - Full-page messenger
  - Facebook-style interface
  - Conversation list sidebar
  - Message thread view
  - Real-time polling (5-second interval)
  - Send messages
  - Handle chat requests

### Dashboard Integration
All account types now have social and messaging features:

- ✅ **User Dashboard** (`src/app/pages/user/overview/`)
  - Social widget integrated
  - Messaging widget integrated
  - Routes added for `/messages`

- ✅ **Specialist Dashboard** (`src/app/pages/specialist/overview/`)
  - Social widget integrated
  - Messaging widget integrated
  - Routes added for `/messages`

- ✅ **Business Owner Dashboard** (`src/app/pages/business/overview/`)
  - Social widget integrated
  - Messaging widget integrated
  - Routes added for `/messages`

- ✅ **Food Enthusiast Dashboard** (via shared routes)
  - Routes added for `/messages`
  - Widgets available through shared components

### Routes Added
All dashboard types now include:
```typescript
{ path: 'messages', loadComponent: () => import('./pages/messages/messages.component') }
{ path: 'messages/:id', loadComponent: () => import('./pages/messages/messages.component') }
```

### Styling
- Consistent NYT Editorial Design across all components
- Responsive grid layouts for widgets
- Mobile-friendly message interface
- Accessible ARIA labels and semantic HTML

## Next Steps

### Immediate Tasks
1. ⏳ Test the frontend implementation in the browser
2. ⏳ Add "Follow" and "Message" buttons to user profiles
3. ⏳ Add "Follow" and "Message" buttons to specialist detail pages
4. ⏳ Test chat request flow end-to-end
5. ⏳ Test message sending and receiving

### Future Enhancements
1. Replace polling with WebSocket (Socket.io) for real-time updates
2. Add typing indicators
3. Add message reactions (emoji)
4. Add file/image upload support
5. Add voice message recording
6. Add message search functionality
7. Add conversation archiving
8. Add user blocking functionality
9. Add group chat management (add/remove participants)
10. Add message threading/replies

