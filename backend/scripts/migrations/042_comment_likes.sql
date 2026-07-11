-- ============================================================
-- Migration 042: Comment Likes
-- Adds: post_comment_likes table
-- ============================================================

CREATE TABLE IF NOT EXISTS post_comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES post_comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_comment_likes_comment_id ON post_comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_post_comment_likes_user_id ON post_comment_likes(user_id);

SELECT 'Comment likes migration completed successfully' as status;
