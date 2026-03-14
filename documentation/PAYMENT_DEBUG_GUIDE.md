# Payment Flow Debugging Guide

## 🔴 Current Error

```
❌ Payment error: 500 Internal Server Error
❌ Error details: { error: "Failed to initialize subscription payment" }
```

**Good News:** ✅ User ID is now being captured correctly!  
**Problem:** ❌ Backend is failing to initialize the payment

---

## 🔍 Step 1: Check Backend Logs

```bash
ssh aidocumines@datasqan.com

# Check recent backend logs
docker logs itiyum-backend-prod --tail 200

# Or follow logs in real-time
docker logs -f itiyum-backend-prod
```

**Look for:**
- Database connection errors
- Paystack API errors
- Missing environment variables
- SQL query errors

---

## 🔍 Step 2: Check Paystack Environment Variables

```bash
# On server
cd ~/eatier/backend
grep "PAYSTACK" .env
```

**Expected output:**
```
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook
```

**If missing, add them:**
```bash
cat >> ~/eatier/backend/.env << 'EOF'

# Paystack Payment Gateway Configuration
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook
EOF

# Restart backend
docker restart itiyum-backend-prod
```

---

## 🔍 Step 3: Check Database Tables

```bash
# On server
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production

# Check if subscription_plans table exists
\dt subscription_plans

# Check what plans are in the database
SELECT id, name, monthly_price, yearly_price FROM subscription_plans;

# Check if payment_transactions table exists
\dt payment_transactions

# Exit psql
\q
```

---

## 🔍 Step 4: Test Paystack Config Endpoint

```bash
# Test if Paystack config is loaded
curl https://itiyum.com/api/payments/config
```

**Expected response:**
```json
{
  "publicKey": "pk_test_eba5a49b7e390527fd9b2749f980885033efbae4",
  "callbackUrl": "https://itiyum.com/payment/callback"
}
```

**If you get an error or empty response:**
- Paystack environment variables are not loaded
- Backend needs to be restarted

---

## 🔍 Step 5: Check Subscription Plans in Database

The frontend is sending `planId: "basic"`, but the database might have different plan IDs.

**Check what plan IDs exist:**
```bash
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "SELECT id, name, monthly_price FROM subscription_plans;"
```

**Possible issues:**
1. **No plans in database** - Need to seed subscription plans
2. **Different plan IDs** - Frontend uses "basic", database might use "plan_basic" or a UUID
3. **Wrong tenant** - Plans might be for a different tenant

---

## 🔧 Step 6: Seed Subscription Plans (If Missing)

If the `subscription_plans` table is empty, you need to seed it:

```bash
# On server
cd ~/eatier/backend

# Check if there's a seed script
ls -la scripts/seed*.sql scripts/seed*.js

# If there's a seed script, run it
# Example:
# psql -U itiyum_prod -d itiyum_production -f scripts/seed_subscription_plans.sql
```

---

## 🔧 Step 7: Manual Plan Creation (Quick Fix)

If plans don't exist, create them manually:

```sql
-- Connect to database
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production

-- Get tenant ID
SELECT id, slug FROM tenants WHERE slug = 'itiyum';

-- Insert subscription plans (replace <tenant_id> with actual ID)
INSERT INTO subscription_plans (tenant_id, id, name, description, monthly_price, yearly_price, features, is_active)
VALUES
  ('<tenant_id>', 'free', 'Free', 'Basic features for getting started', 0, 0, '{"max_menu_items": 10, "max_photos": 5}', true),
  ('<tenant_id>', 'basic', 'Basic', 'Essential features for small businesses', 29.99, 299.99, '{"max_menu_items": 50, "max_photos": 20}', true),
  ('<tenant_id>', 'professional', 'Professional', 'Advanced features for growing businesses', 79.99, 799.99, '{"max_menu_items": 200, "max_photos": 100}', true),
  ('<tenant_id>', 'enterprise', 'Enterprise', 'Full features for large businesses', 199.99, 1999.99, '{"max_menu_items": -1, "max_photos": -1}', true);

-- Verify
SELECT id, name, monthly_price FROM subscription_plans;

-- Exit
\q
```

---

## 🔧 Step 8: Check Payment Transactions Table

```bash
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "\d payment_transactions"
```

**If table doesn't exist:**
- Run migrations: `cd ~/eatier/backend && npm run migrate`
- Or create it manually (check migration files)

---

## ✅ Step 9: Test Again

After fixing the issues:

1. **Restart backend:**
   ```bash
   docker restart itiyum-backend-prod
   ```

2. **Test payment flow:**
   - Go to: https://itiyum.com/business/accounts
   - Click "Upgrade" on Basic plan
   - Click "Pay $29.99"
   - Check console logs

3. **Expected console output:**
   ```
   📤 Sending payment request: { userId: "...", planId: "basic", ... }
   ✅ Payment response: { success: true, authorization_url: "https://checkout.paystack.com/..." }
   🔗 Redirecting to Paystack: ...
   ```

---

## 🎯 Most Likely Issues

Based on the error, here are the most likely problems in order:

1. **❌ Subscription plans not in database** (90% likely)
   - Solution: Seed the plans or create them manually

2. **❌ Paystack credentials not loaded** (5% likely)
   - Solution: Add to .env and restart backend

3. **❌ Database tables missing** (3% likely)
   - Solution: Run migrations

4. **❌ Tenant mismatch** (2% likely)
   - Solution: Check tenant slug in request headers

---

## 📞 Next Steps

1. **Check backend logs** (Step 1) - This will tell you the exact error
2. **Check if plans exist** (Step 5) - Most likely issue
3. **Seed plans if missing** (Step 7)
4. **Test again** (Step 9)

Share the backend logs with me and I can help you fix the exact issue! 🚀

