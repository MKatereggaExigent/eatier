-- ============================================
-- PRESENCE AND ENHANCED MESSAGING SYSTEM
-- Real-time user presence, file sharing, pokes
-- ============================================

-- ============================================
-- USER_PRESENCE TABLE
-- Tracks online/offline/away status
-- ============================================
CREATE TABLE IF NOT EXISTS user_presence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'offline', -- 'online', 'away', 'offline', 'busy'
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    device_info JSONB DEFAULT '{}', -- Browser, OS, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT user_presence_unique UNIQUE(tenant_id, user_id),
    CONSTRAINT user_presence_status_check CHECK (status IN ('online', 'away', 'offline', 'busy'))
);

-- Indexes for fast presence lookups
CREATE INDEX IF NOT EXISTS idx_user_presence_tenant ON user_presence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_user ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen DESC);

-- ============================================
-- POKES TABLE
-- Nudge/poke feature to get attention
-- ============================================
CREATE TABLE IF NOT EXISTS pokes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    poker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    poked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT, -- Optional message with the poke
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT pokes_not_self CHECK (poker_id != poked_id)
);

-- Indexes for pokes
CREATE INDEX IF NOT EXISTS idx_pokes_tenant ON pokes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pokes_poker ON pokes(poker_id);
CREATE INDEX IF NOT EXISTS idx_pokes_poked ON pokes(poked_id, is_read);
CREATE INDEX IF NOT EXISTS idx_pokes_created_at ON pokes(created_at DESC);

-- ============================================
-- MESSAGE_FILES TABLE
-- File attachments for messages
-- ============================================
CREATE TABLE IF NOT EXISTS message_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL, -- MIME type
    file_size BIGINT NOT NULL, -- Size in bytes
    file_url TEXT NOT NULL, -- S3 or local storage URL
    thumbnail_url TEXT, -- For images/videos
    upload_status VARCHAR(50) DEFAULT 'completed', -- 'uploading', 'completed', 'failed'
    metadata JSONB DEFAULT '{}', -- Width, height, duration, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT message_files_size_check CHECK (file_size > 0 AND file_size <= 104857600) -- Max 100MB
);

-- Indexes for file lookups
CREATE INDEX IF NOT EXISTS idx_message_files_message ON message_files(message_id);
CREATE INDEX IF NOT EXISTS idx_message_files_created_at ON message_files(created_at DESC);

-- ============================================
-- TYPING_INDICATORS TABLE
-- Show when users are typing
-- ============================================
CREATE TABLE IF NOT EXISTS typing_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_typing BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (CURRENT_TIMESTAMP + INTERVAL '10 seconds'),
    
    -- Constraints
    CONSTRAINT typing_indicators_unique UNIQUE(conversation_id, user_id)
);

-- Indexes for typing indicators
CREATE INDEX IF NOT EXISTS idx_typing_indicators_conversation ON typing_indicators(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires_at ON typing_indicators(expires_at);

-- ============================================
-- MESSAGE_REACTIONS TABLE
-- React to messages with emojis
-- ============================================
CREATE TABLE IF NOT EXISTS message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reaction VARCHAR(50) NOT NULL, -- Emoji or reaction type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT message_reactions_unique UNIQUE(message_id, user_id, reaction)
);

-- Indexes for reactions
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON message_reactions(user_id);

-- ============================================
-- ONLINE_USERS_VIEW
-- View to quickly get online users
-- ============================================
CREATE OR REPLACE VIEW online_users AS
SELECT 
    up.user_id,
    up.tenant_id,
    up.status,
    up.last_seen,
    up.last_activity,
    u.first_name,
    u.last_name,
    u.email,
    u.avatar_url,
    u.role
FROM user_presence up
JOIN users u ON up.user_id = u.id
WHERE up.status IN ('online', 'away', 'busy')
    AND up.last_activity > (CURRENT_TIMESTAMP - INTERVAL '5 minutes');

-- Grant permissions
GRANT SELECT ON online_users TO PUBLIC;

COMMIT;

