# Fix Subscription Plans - UUID vs String ID Issue

## 🔴 Problem

```
Error: invalid input syntax for type uuid: "basic"
```

The database `subscription_plans` table has `id` column as UUID type, but the frontend is sending string IDs like "basic", "professional", etc.

---

## ✅ Solution: Check and Fix Plan IDs

### Step 1: Check Current Table Schema

```bash
ssh aidocumines@datasqan.com

# Check the subscription_plans table structure
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "\d subscription_plans"
```

**Look for the `id` column type:**
- If it's `uuid` → We need to change it to `text` or `varchar`
- If it's `text`/`varchar` → Plans might not exist, need to seed them

---

### Step 2: Check If Plans Exist

```bash
# Check what plans are in the database
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "SELECT id, name, monthly_price FROM subscription_plans;"
```

**Possible outcomes:**
1. **No rows** → Plans don't exist, need to create them
2. **UUID ids** → Need to either:
   - Change table to use string IDs, OR
   - Update frontend to use UUIDs

---

### Step 3A: Fix - Change ID Column to Text (Recommended)

If the `id` column is UUID, change it to text:

```bash
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production << 'EOF'
-- Start transaction
BEGIN;

-- Drop foreign key constraints if any
ALTER TABLE user_subscriptions DROP CONSTRAINT IF EXISTS user_subscriptions_plan_id_fkey;
ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_subscription_plan_id_fkey;

-- Change id column type from UUID to TEXT
ALTER TABLE subscription_plans ALTER COLUMN id TYPE TEXT;

-- Recreate foreign keys
ALTER TABLE user_subscriptions 
  ADD CONSTRAINT user_subscriptions_plan_id_fkey 
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id);

-- Commit
COMMIT;

-- Verify
\d subscription_plans
EOF
```

---

### Step 3B: Create Subscription Plans

After fixing the column type, create the plans:

```bash
# Copy the SQL file to server
scp fix_subscription_plans.sql aidocumines@datasqan.com:~/

# Run it
ssh aidocumines@datasqan.com
docker exec -i itiyum-backend-prod psql -U itiyum_prod -d itiyum_production < ~/fix_subscription_plans.sql
```

**Or run directly:**

```bash
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production << 'EOF'
-- Get tenant ID
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'itiyum' LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant not found';
  END IF;

  -- Delete existing plans
  DELETE FROM subscription_plans WHERE tenant_id = v_tenant_id;

  -- Insert plans with string IDs
  INSERT INTO subscription_plans (tenant_id, id, name, description, monthly_price, yearly_price, features, is_active)
  VALUES
    (v_tenant_id, 'free', 'Free', 'Basic features', 0.00, 0.00, '{}', true),
    (v_tenant_id, 'basic', 'Basic', 'Essential features', 29.99, 299.99, '{}', true),
    (v_tenant_id, 'professional', 'Professional', 'Advanced features', 79.99, 799.99, '{}', true),
    (v_tenant_id, 'enterprise', 'Enterprise', 'Full features', 199.99, 1999.99, '{}', true);

  RAISE NOTICE 'Plans created successfully!';
END $$;

-- Verify
SELECT id, name, monthly_price, yearly_price FROM subscription_plans;
EOF
```

---

### Step 4: Verify Plans Were Created

```bash
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "SELECT id, name, monthly_price, yearly_price FROM subscription_plans ORDER BY monthly_price;"
```

**Expected output:**
```
   id      |     name      | monthly_price | yearly_price
-----------+---------------+---------------+--------------
 free      | Free          |          0.00 |         0.00
 basic     | Basic         |         29.99 |       299.99
 professional | Professional |      79.99 |       799.99
 enterprise | Enterprise   |        199.99 |      1999.99
```

---

### Step 5: Test Payment Flow

1. Go to: https://itiyum.com/business/accounts
2. Open console (F12)
3. Click "Upgrade" on Basic plan
4. Click "Pay $29.99"

**Expected console output:**
```
📤 Sending payment request: { userId: "...", planId: "basic", ... }
✅ Payment response: { success: true, authorization_url: "https://checkout.paystack.com/..." }
🔗 Redirecting to Paystack: ...
```

---

## 🚀 Quick Fix Commands (All-in-One)

```bash
# SSH into server
ssh aidocumines@datasqan.com

# Fix the table and create plans
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production << 'EOF'
-- Change id column to text
BEGIN;
ALTER TABLE subscription_plans DROP CONSTRAINT IF EXISTS subscription_plans_pkey CASCADE;
ALTER TABLE subscription_plans ALTER COLUMN id TYPE TEXT;
ALTER TABLE subscription_plans ADD PRIMARY KEY (id);
COMMIT;

-- Get tenant and create plans
DO $$
DECLARE v_tenant_id UUID;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'itiyum' LIMIT 1;
  DELETE FROM subscription_plans WHERE tenant_id = v_tenant_id;
  INSERT INTO subscription_plans (tenant_id, id, name, description, monthly_price, yearly_price, features, is_active)
  VALUES
    (v_tenant_id, 'free', 'Free', 'Basic features', 0.00, 0.00, '{}', true),
    (v_tenant_id, 'basic', 'Basic', 'Essential features', 29.99, 299.99, '{}', true),
    (v_tenant_id, 'professional', 'Professional', 'Advanced features', 79.99, 799.99, '{}', true),
    (v_tenant_id, 'enterprise', 'Enterprise', 'Full features', 199.99, 1999.99, '{}', true);
END $$;

-- Verify
SELECT id, name, monthly_price, yearly_price FROM subscription_plans;
EOF
```

---

## ✅ Success Criteria

After running the fix:

- [ ] `subscription_plans.id` column is TEXT type
- [ ] 4 plans exist: free, basic, professional, enterprise
- [ ] Plans have correct prices
- [ ] Payment flow works without UUID error
- [ ] Can be redirected to Paystack payment page

---

## 📝 Alternative: Use UUIDs in Frontend

If you prefer to keep UUID ids in the database, update the frontend instead:

1. Fetch plans from backend API
2. Use the actual UUID ids instead of hardcoded strings
3. Display plan names but send UUIDs to backend

This is more complex and requires frontend changes. The text ID approach is simpler and more maintainable.

