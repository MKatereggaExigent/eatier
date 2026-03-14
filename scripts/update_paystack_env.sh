#!/bin/bash

# Script to update Paystack environment variables on production server
# Run this on the server: datasqan.com

echo "🔐 Updating Paystack Environment Variables"
echo "==========================================="
echo ""

# Navigate to backend directory
cd ~/eatier/backend

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating new one..."
    touch .env
fi

# Backup existing .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
echo "✅ Backed up existing .env file"

# Add or update Paystack variables
echo ""
echo "📝 Adding Paystack configuration..."

# Remove old Paystack variables if they exist
sed -i '/PAYSTACK_SECRET_KEY/d' .env
sed -i '/PAYSTACK_PUBLIC_KEY/d' .env
sed -i '/PAYSTACK_CALLBACK_URL/d' .env
sed -i '/PAYSTACK_WEBHOOK_URL/d' .env

# Add new Paystack variables
cat >> .env << 'EOF'

# Paystack Payment Gateway Configuration
PAYSTACK_SECRET_KEY=sk_test_07f225c3ce8efd527c6398fb290bc30bb7129886
PAYSTACK_PUBLIC_KEY=pk_test_eba5a49b7e390527fd9b2749f980885033efbae4
PAYSTACK_CALLBACK_URL=https://itiyum.com/payment/callback
PAYSTACK_WEBHOOK_URL=https://itiyum.com/api/payments/webhook
EOF

echo "✅ Paystack configuration added to .env"
echo ""
echo "📋 Current Paystack configuration:"
echo "-----------------------------------"
grep "PAYSTACK" .env
echo ""
echo "✅ Done! Restart the backend to apply changes:"
echo "   docker restart itiyum-backend-prod"
echo "   or"
echo "   pm2 restart itiyum-backend"

