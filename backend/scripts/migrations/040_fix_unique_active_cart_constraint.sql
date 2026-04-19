-- Migration 040: Fix unique_active_cart constraint to only apply to 'active' status
-- The current constraint prevents multiple 'converted' carts, which blocks users from
-- placing multiple orders from the same restaurant

-- Drop the old constraint
ALTER TABLE shopping_carts DROP CONSTRAINT IF EXISTS unique_active_cart;

-- Create a partial unique index that only applies to 'active' status
-- This allows multiple 'converted' or 'abandoned' carts but only one 'active' cart per user per business
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_cart_idx 
ON shopping_carts(user_id, business_id) 
WHERE status = 'active';

-- Add a comment explaining the constraint
COMMENT ON INDEX unique_active_cart_idx IS 'Ensures only one active cart per user per business. Allows multiple converted/abandoned carts.';

-- Log successful migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 040: Fixed unique_active_cart constraint';
  RAISE NOTICE '   - Dropped old constraint that prevented multiple converted carts';
  RAISE NOTICE '   - Created partial index that only applies to active carts';
  RAISE NOTICE '   - Users can now place multiple orders from same restaurant';
END $$;
