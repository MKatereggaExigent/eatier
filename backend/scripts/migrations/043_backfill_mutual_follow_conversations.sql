-- ============================================================
-- Migration 043: Backfill conversations for existing mutual follows
-- Creates chat_conversations + chat_participants for any pair
-- of users who follow each other but don't have a direct
-- conversation yet.
-- ============================================================

INSERT INTO chat_conversations (tenant_id, conversation_type, created_by, last_message_at)
SELECT
  u1.tenant_id,
  'direct',
  uf1.follower_id,
  NOW()
FROM user_follows uf1
JOIN user_follows uf2 ON uf1.follower_id = uf2.following_id AND uf1.following_id = uf2.follower_id
JOIN users u1 ON uf1.follower_id = u1.id
WHERE NOT EXISTS (
  SELECT 1 FROM chat_conversations c
  INNER JOIN chat_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = uf1.follower_id
  INNER JOIN chat_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = uf1.following_id
  WHERE c.conversation_type = 'direct'
)
ON CONFLICT DO NOTHING;

INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
SELECT c.id, uf.follower_id, 'member', NOW()
FROM user_follows uf
JOIN chat_conversations c ON c.conversation_type = 'direct'
  AND EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = uf.following_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = uf.follower_id
  )
WHERE EXISTS (
  SELECT 1 FROM user_follows uf2
  WHERE uf2.follower_id = uf.following_id AND uf2.following_id = uf.follower_id
)
ON CONFLICT DO NOTHING;

INSERT INTO chat_participants (conversation_id, user_id, role, joined_at)
SELECT c.id, uf.following_id, 'member', NOW()
FROM user_follows uf
JOIN chat_conversations c ON c.conversation_type = 'direct'
  AND EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = uf.follower_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.conversation_id = c.id AND cp.user_id = uf.following_id
  )
WHERE EXISTS (
  SELECT 1 FROM user_follows uf2
  WHERE uf2.follower_id = uf.following_id AND uf2.following_id = uf.follower_id
)
ON CONFLICT DO NOTHING;

SELECT 'Backfill complete' as status;
