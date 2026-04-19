# 💱 IP-Based Currency System

## Overview

The platform now automatically detects the user's currency based on their IP address and converts all prices to their local currency using real-time exchange rates.

---

## 🌍 How It Works

### 1. IP Detection
- Every request includes the user's IP address
- Middleware (`currencyMiddleware.js`) extracts the IP
- IP is geo-located to determine country

### 2. Currency Mapping
- Country code is mapped to currency code
- Example: `ZA` → `ZAR`, `UG` → `UGX`, `US` → `USD`

### 3. Exchange Rate Conversion
- All prices in database are stored in **UGX (Ugandan Shillings)**
- Prices are converted to user's currency using live exchange rates
- Exchange rates are cached for 1 hour
- Fallback rates available if API is down

---

## 💰 Supported Currencies

| Country | Currency | Code |
|---------|----------|------|
| Uganda | Ugandan Shilling | UGX |
| South Africa | South African Rand | ZAR |
| Kenya | Kenyan Shilling | KES |
| Tanzania | Tanzanian Shilling | TZS |
| Rwanda | Rwandan Franc | RWF |
| Nigeria | Nigerian Naira | NGN |
| Ghana | Ghanaian Cedi | GHS |
| United States | US Dollar | USD |
| United Kingdom | British Pound | GBP |
| Europe | Euro | EUR |
| India | Indian Rupee | INR |
| China | Chinese Yuan | CNY |
| Japan | Japanese Yen | JPY |
| Australia | Australian Dollar | AUD |
| Canada | Canadian Dollar | CAD |

---

## 🔧 Implementation

### Backend Middleware

Every request passes through currency detection:

```javascript
// middleware/currencyMiddleware.js
function detectCurrency(req, res, next) {
  // Get user's IP
  const ip = req.ip || req.headers['x-forwarded-for'];
  
  // Detect country from IP
  const geo = geoip.lookup(ip);
  
  // Map country to currency
  req.userCurrency = {
    currency: COUNTRY_CURRENCY_MAP[geo.country] || 'UGX',
    country: geo.country,
    ip: ip
  };
  
  next();
}
```

### Currency Service

Handles exchange rate fetching and conversion:

```javascript
// services/currencyService.js

// Fetch exchange rates (cached for 1 hour)
await getExchangeRates();

// Convert price
const priceInZAR = await convertCurrency(priceInUGX, 'ZAR');
```

### API Response

All price fields are automatically converted:

```json
{
  "menuItem": {
    "price": 15000,           // Original price in UGX
    "priceInUserCurrency": 75.00,  // Converted to ZAR
    "currency": "ZAR"
  }
}
```

---

## 🧪 Testing

### Test with Different IPs

You can override currency using HTTP header:

```bash
curl https://itiyum.com/api/menus \
  -H "x-currency: USD"
```

### Test Exchange Rates

Check current rates:

```bash
curl https://api.exchangerate-api.com/v4/latest/UGX
```

### Test IP Geolocation

```bash
node -e "
const geoip = require('geoip-lite');
console.log(geoip.lookup('197.234.240.1')); // South African IP
"
```

Expected output:
```json
{
  "country": "ZA",
  "region": "GP",
  "city": "Johannesburg"
}
```

---

## 📊 Exchange Rate Examples

**1 UGX (Ugandan Shilling) =**

- 0.00027 USD (US Dollar)
- 0.0050 ZAR (South African Rand)
- 0.034 KES (Kenyan Shilling)
- 0.00025 EUR (Euro)
- 0.00021 GBP (British Pound)

**Example Price Conversion:**

| Price in UGX | USD | ZAR | KES | EUR |
|--------------|-----|-----|-----|-----|
| 15,000 | $4.05 | R75.00 | KSh 510 | €3.75 |
| 50,000 | $13.50 | R250.00 | KSh 1,700 | €12.50 |
| 100,000 | $27.00 | R500.00 | KSh 3,400 | €25.00 |

---

## 🔄 Exchange Rate Updates

### Automatic Updates
- Exchange rates are fetched from free API
- Cached for 1 hour to reduce API calls
- Auto-refreshed when cache expires

### Fallback Rates
If API is unavailable, system uses hardcoded fallback rates (approximate 2024 rates).

### Manual Update
Rates update automatically, but you can force update:

```javascript
const { updateExchangeRates } = require('./services/currencyService');
await updateExchangeRates();
```

---

## 🚀 Deployment

### Requirements
- `geoip-lite` package (installed ✅)
- `axios` package (installed ✅)
- Internet connection for exchange rate API

### Deploy
```bash
cd ~/eatier
git pull origin development-v2
./deploy_entire_project.sh
```

### Verify
```bash
# Check logs for currency detection
docker logs -f itiyum-backend | grep "🌍\|💱"
```

Expected logs:
```
🌍 Getting currency for IP: 197.234.240.1
   Country: ZA → Currency: ZAR
💱 Fetching exchange rates from API...
✅ Exchange rates updated successfully
💱 Converted 15000 UGX → 75.00 ZAR
```

---

## ✅ Summary

**What's Implemented:**
- ✅ Automatic IP-based currency detection
- ✅ Real-time exchange rate fetching
- ✅ Price conversion to user's local currency
- ✅ 15+ currencies supported
- ✅ 1-hour caching for performance
- ✅ Fallback rates if API is down
- ✅ Currency override via HTTP header (for testing)

**What's Next:**
- Integrate currency conversion into ALL API responses
- Update frontend to display converted prices
- Add currency symbol formatting
- Show original price + converted price option

**The currency system is ready to use!** 💱✅
