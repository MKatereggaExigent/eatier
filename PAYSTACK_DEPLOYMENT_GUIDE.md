# Paystack Payment Gateway - Deployment Guide

## 🎯 Overview

This guide covers the end-to-end deployment of the Paystack payment gateway for subscription upgrades on the Itiyum platform.

---

## 📋 Prerequisites

- Paystack Test Account credentials (provided)
- Access to production server (datasqan.com)
- Backend and frontend deployment access

---

## 🔐 Step 1: Configure Environment Variables

### Local Development (Already Done ✅)

The following variables have been added to `backend/.env.local`:

```bash
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook
```

### Production Server

**On your local machine:**

1. Copy the update script to the server:
```bash
scp update_paystack_env.sh aidocumines@datasqan.com:~/
```

2. SSH into the server:
```bash
ssh aidocumines@datasqan.com
```

3. Run the update script:
```bash
chmod +x ~/update_paystack_env.sh
~/update_paystack_env.sh
```

4. Restart the backend:
```bash
docker restart itiyum-backend-prod
# or if using PM2:
# pm2 restart itiyum-backend
```

---

## 🚀 Step 2: Deploy Code Changes

### Commit and Push Changes

```bash
cd ~/Documents/Github/eatier

git add .
git commit -m "Configure Paystack payment gateway for subscription upgrades

- Add Paystack test credentials to environment files
- Configure callback URL: https://itiyum.com/payment/callback
- Configure webhook URL: https://itiyum.com/api/payments/webhook
- Ready for end-to-end payment testing"

git push origin development-v2
```

### Deploy to Production

**On the server:**

```bash
cd ~/eatier
git pull origin development-v2
./latest_caprover_deployment.sh
```

---

## ✅ Step 3: Verify Backend Configuration

### Check Environment Variables

```bash
# On the server
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

### Test Payment Config Endpoint

```bash
curl https://itiyum.com/api/payments/config
```

**Expected response:**
```json
{
  "publicKey": "pk_test_eba5a49b7e390527fd9b2749f980885033efbae4",
  "callbackUrl": "https://itiyum.com/payment/callback"
}
```

---

## 🧪 Step 4: Test End-to-End Payment Flow

### 1. Navigate to Accounts Centre

Go to: **https://itiyum.com/business/accounts**

### 2. Select a Subscription Plan

- Click on **"Professional"** or **"Enterprise"** plan
- Click **"Upgrade"** button
- The payment modal should open

### 3. Initiate Payment

- Click **"Proceed to Payment"**
- You should be redirected to Paystack's payment page

### 4. Complete Test Payment

Use Paystack test cards:

**Success:**
- Card: `4084 0840 8408 4081`
- CVV: `408`
- Expiry: Any future date
- PIN: `0000`
- OTP: `123456`

**Failure:**
- Card: `5060 6666 6666 6666`

### 5. Verify Callback

After payment:
- You should be redirected to: `https://itiyum.com/payment/callback?reference=SUB_xxxxx`
- The page should show "Payment Successful!"
- Your subscription should be activated

---

## 📊 Step 5: Monitor and Debug

### Check Backend Logs

```bash
# On the server
docker logs -f itiyum-backend-prod --tail 100
```

### Check for Payment Transactions

```bash
# On the server
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "SELECT * FROM payment_transactions ORDER BY created_at DESC LIMIT 5;"
```

### Check Subscriptions

```bash
docker exec -it itiyum-backend-prod psql -U itiyum_prod -d itiyum_production -c "SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 5;"
```

---

## 🔗 Important URLs

| Purpose | URL |
|---------|-----|
| Accounts Centre | https://itiyum.com/business/accounts |
| Payment Callback | https://itiyum.com/payment/callback |
| Webhook Endpoint | https://itiyum.com/api/payments/webhook |
| Payment Config | https://itiyum.com/api/payments/config |

---

## ✅ What's Already Implemented

1. ✅ **Backend Routes:**
   - `/api/payments/config` - Get Paystack public key
   - `/api/payments/initialize` - Initialize payment
   - `/api/payments/verify/:reference` - Verify payment
   - `/api/payments/webhook` - Handle Paystack webhooks
   - `/api/subscriptions/subscribe` - Initialize subscription payment
   - `/api/subscriptions/activate` - Activate subscription after payment

2. ✅ **Frontend Components:**
   - Payment callback page (`/payment/callback`)
   - Accounts centre with upgrade buttons
   - Payment modal with form

3. ✅ **Paystack Service:**
   - Transaction initialization
   - Payment verification
   - Webhook signature validation
   - Subscription handling

---

## 🎉 Success Criteria

- [ ] Environment variables configured on production
- [ ] Backend restarted and healthy
- [ ] Payment config endpoint returns correct public key
- [ ] Can initiate payment from Accounts Centre
- [ ] Redirected to Paystack payment page
- [ ] Can complete test payment
- [ ] Redirected back to callback page
- [ ] Subscription activated in database
- [ ] Webhook receives payment confirmation

---

## 🆘 Troubleshooting

### Issue: "Failed to initialize payment"

**Check:**
1. Backend logs for errors
2. Environment variables are set correctly
3. Database connection is working

### Issue: "Payment verification failed"

**Check:**
1. Paystack secret key is correct
2. Reference parameter is in callback URL
3. Backend can reach Paystack API

### Issue: "Subscription not activated"

**Check:**
1. Webhook endpoint is accessible
2. Database has payment_transactions table
3. Check backend logs for activation errors

---

## 📞 Support

For issues, check:
1. Backend logs: `docker logs itiyum-backend-prod`
2. Browser console for frontend errors
3. Paystack dashboard for transaction status

