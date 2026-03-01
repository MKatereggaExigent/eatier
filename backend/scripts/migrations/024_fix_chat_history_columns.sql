-- Migration 024: Fix chat_history table columns
-- The chatService.js expects 'message' and 'is_ai_response' columns
-- but the original schema has 'content' and 'role'

-- Add the missing columns if they don't exist
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS is_ai_response BOOLEAN DEFAULT false;

-- Copy data from existing columns if they exist
UPDATE chat_history 
SET message = content 
WHERE message IS NULL AND content IS NOT NULL;

UPDATE chat_history 
SET is_ai_response = (role = 'assistant')
WHERE is_ai_response IS NULL AND role IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_history_user_tenant 
ON chat_history(user_id, tenant_id, created_at DESC);

