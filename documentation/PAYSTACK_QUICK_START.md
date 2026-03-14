# Paystack Payment Gateway - Quick Start

## 🚀 Quick Deployment (3 Steps)

### Step 1: Update Production Environment (On Server)

```bash
# SSH into server
ssh aidocumines@datasqan.com

# Navigate to backend
cd ~/eatier/backend

# Add Paystack credentials to .env
cat >> .env << 'EOF'

# Paystack Payment Gateway Configuration
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook
EOF

# Restart backend
docker restart itiyum-backend-prod
```

### Step 2: Commit and Deploy Code

```bash
# On your local machine
cd ~/Documents/Github/eatier

git add .
git commit -m "Configure Paystack payment gateway"
git push origin development-v2

# On server
cd ~/eatier
git pull origin development-v2
./latest_caprover_deployment.sh
```

### Step 3: Test Payment Flow

1. Go to: https://itiyum.com/business/accounts
2. Click "Upgrade" on Professional plan
3. Click "Proceed to Payment"
4. Use test card: `4084 0840 8408 4081`
5. CVV: `408`, PIN: `0000`, OTP: `123456`
6. Verify redirect to callback page
7. Check subscription is activated

---

## ✅ Verification Checklist

- [ ] Environment variables added to production `.env`
- [ ] Backend restarted successfully
- [ ] Can access https://itiyum.com/business/accounts
- [ ] "Upgrade" button works
- [ ] Redirects to Paystack payment page
- [ ] Test payment completes successfully
- [ ] Redirects to https://itiyum.com/payment/callback
- [ ] Subscription shows as "Active"

---

## 🧪 Test Cards

**Successful Payment:**
- Card: `4084 0840 8408 4081`
- CVV: `408`
- Expiry: Any future date
- PIN: `0000`
- OTP: `123456`

**Failed Payment:**
- Card: `5060 6666 6666 6666`

---

## 🔗 Key URLs

- **Accounts Centre:** https://itiyum.com/business/accounts
- **Payment Callback:** https://itiyum.com/payment/callback
- **Webhook:** https://itiyum.com/api/payments/webhook
- **Config API:** https://itiyum.com/api/payments/config

---

## 📊 Quick Debug Commands

```bash
# Check environment variables
grep "PAYSTACK" ~/eatier/backend/.env

# Test config endpoint
curl https://itiyum.com/api/payments/config

# Check backend logs
docker logs -f itiyum-backend-prod --tail 50

# Check recent payments
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "SELECT reference, amount, status, created_at FROM payment_transactions ORDER BY created_at DESC LIMIT 5;"
```

---

## 🎯 What's Already Built

✅ All backend routes for payment processing  
✅ Paystack service integration  
✅ Payment callback page  
✅ Subscription activation logic  
✅ Webhook handler  
✅ Accounts centre UI with upgrade buttons  

**You just need to:**
1. Add environment variables to production
2. Deploy the code
3. Test the payment flow

---

## 🆘 Common Issues

**"Failed to initialize payment"**
→ Check backend logs: `docker logs itiyum-backend-prod`

**"502 Bad Gateway"**
→ Restart backend: `docker restart itiyum-backend-prod`

**"Payment not verified"**
→ Check Paystack secret key in `.env`

**"Subscription not activated"**
→ Check database: `SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;`

---

## 📞 Need Help?

See full guide: `PAYSTACK_DEPLOYMENT_GUIDE.md`

