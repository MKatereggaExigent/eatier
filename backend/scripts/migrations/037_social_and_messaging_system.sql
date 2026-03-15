-- ============================================
-- Migration 037: Social and Messaging System
-- Implements Erlang-style actor model messaging
-- with follow/unfollow functionality
-- ============================================

-- ============================================
-- USER_FOLLOWS TABLE (Social Graph)
-- ============================================
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT user_follows_unique UNIQUE(follower_id, following_id),
    CONSTRAINT user_follows_no_self_follow CHECK (follower_id != following_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_tenant ON user_follows(tenant_id);

-- ============================================
-- CHAT_CONVERSATIONS TABLE (Actor Mailboxes)
-- Each conversation is an independent actor
-- ============================================
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_type VARCHAR(50) DEFAULT 'direct', -- 'direct', 'group'
    title VARCHAR(255), -- For group chats
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}', -- For extensibility
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_tenant ON chat_conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by ON chat_conversations(created_by);

-- ============================================
-- CHAT_PARTICIPANTS TABLE (Actor Membership)
-- Defines who can send/receive messages in a conversation
-- ============================================
CREATE TABLE IF NOT EXISTS chat_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_read_at TIMESTAMP WITH TIME ZONE,
    is_muted BOOLEAN DEFAULT false,
    is_archived BOOLEAN DEFAULT false,
    unread_count INTEGER DEFAULT 0,
    
    -- Constraints
    CONSTRAINT chat_participants_unique UNIQUE(conversation_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_unread ON chat_participants(user_id, unread_count) WHERE unread_count > 0;

-- ============================================
-- CHAT_MESSAGES TABLE (Messages in Mailbox)
-- Implements Erlang-style message passing
-- ============================================
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'file', 'system'
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]', -- Array of file URLs
    metadata JSONB DEFAULT '{}', -- For extensibility (reactions, mentions, etc.)
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure deleted messages don't show content
    CONSTRAINT chat_messages_deleted_content CHECK (
        (is_deleted = false) OR (is_deleted = true AND content = '[Message deleted]')
    )
);

-- Indexes for fast message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON chat_messages(reply_to_message_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- ============================================
-- CHAT_MESSAGE_READS TABLE (Message Delivery Tracking)
-- Tracks who has read which messages (Erlang receive acknowledgment)
-- ============================================
CREATE TABLE IF NOT EXISTS chat_message_reads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chat_message_reads_unique UNIQUE(message_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_message ON chat_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reads_user ON chat_message_reads(user_id);

-- ============================================
-- CHAT_REQUESTS TABLE (Connection Requests)
-- Users must request to chat before starting a conversation
-- ============================================
CREATE TABLE IF NOT EXISTS chat_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'cancelled'
    message TEXT, -- Optional message with request
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chat_requests_unique UNIQUE(requester_id, recipient_id),
    CONSTRAINT chat_requests_no_self_request CHECK (requester_id != recipient_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_requests_requester ON chat_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_chat_requests_recipient ON chat_requests(recipient_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_requests_tenant ON chat_requests(tenant_id);

-- Migration complete message
DO $$
BEGIN
    RAISE NOTICE 'Migration 037_social_and_messaging_system.sql completed successfully';
END $$;

