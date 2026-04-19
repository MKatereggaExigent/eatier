const geoip = require('geoip-lite');
const axios = require('axios');

// Base currency is UGX (Ugandan Shillings) - all prices in DB are in UGX
const BASE_CURRENCY = 'UGX';

// Exchange rates cache (refreshed every hour)
let exchangeRates = {};
let lastRatesUpdate = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Free exchange rate API (no key required)
const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/UGX';

/**
 * Country to currency mapping
 */
const COUNTRY_CURRENCY_MAP = {
  'UG': 'UGX', // Uganda
  'ZA': 'ZAR', // South Africa
  'KE': 'KES', // Kenya
  'TZ': 'TZS', // Tanzania
  'RW': 'RWF', // Rwanda
  'US': 'USD', // United States
  'GB': 'GBP', // United Kingdom
  'EU': 'EUR', // European Union
  'NG': 'NGN', // Nigeria
  'GH': 'GHS', // Ghana
  'IN': 'INR', // India
  'CN': 'CNY', // China
  'JP': 'JPY', // Japan
  'AU': 'AUD', // Australia
  'CA': 'CAD', // Canada
};

/**
 * Get currency from IP address
 */
function getCurrencyFromIP(ipAddress) {
  try {
    console.log('🌍 Getting currency for IP:', ipAddress);

    // Handle localhost
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress === 'localhost') {
      console.log('   Localhost detected - using default UGX');
      return { currency: BASE_CURRENCY, country: 'UG' };
    }

    // Get geolocation from IP
    const geo = geoip.lookup(ipAddress);
    
    if (!geo) {
      console.log('   IP lookup failed - using default UGX');
      return { currency: BASE_CURRENCY, country: 'UG' };
    }

    const country = geo.country;
    const currency = COUNTRY_CURRENCY_MAP[country] || BASE_CURRENCY;

    console.log('   Country:', country, '→ Currency:', currency);

    return { currency, country };
  } catch (error) {
    console.error('Error getting currency from IP:', error.message);
    return { currency: BASE_CURRENCY, country: 'UG' };
  }
}

/**
 * Fetch latest exchange rates
 */
async function updateExchangeRates() {
  try {
    console.log('💱 Fetching exchange rates from API...');
    
    const response = await axios.get(EXCHANGE_RATE_API, {
      timeout: 5000
    });

    if (response.data && response.data.rates) {
      exchangeRates = response.data.rates;
      lastRatesUpdate = Date.now();
      
      console.log('✅ Exchange rates updated successfully');
      console.log('   Sample rates: 1 UGX =', {
        USD: exchangeRates.USD?.toFixed(6),
        ZAR: exchangeRates.ZAR?.toFixed(6),
        KES: exchangeRates.KES?.toFixed(6)
      });
      
      return true;
    }

    throw new Error('Invalid response format');
  } catch (error) {
    console.error('❌ Failed to fetch exchange rates:', error.message);
    console.log('   Using fallback rates');
    
    // Fallback rates (approximate, updated 2024)
    exchangeRates = {
      UGX: 1,
      USD: 0.00027,   // 1 UGX = 0.00027 USD
      ZAR: 0.0050,    // 1 UGX = 0.0050 ZAR
      KES: 0.034,     // 1 UGX = 0.034 KES
      TZS: 0.69,      // 1 UGX = 0.69 TZS
      RWF: 0.35,      // 1 UGX = 0.35 RWF
      EUR: 0.00025,   // 1 UGX = 0.00025 EUR
      GBP: 0.00021,   // 1 UGX = 0.00021 GBP
      NGN: 0.38,      // 1 UGX = 0.38 NGN
      GHS: 0.0033,    // 1 UGX = 0.0033 GHS
    };
    
    lastRatesUpdate = Date.now();
    return false;
  }
}

/**
 * Get exchange rates (with caching)
 */
async function getExchangeRates() {
  const now = Date.now();
  
  // Check if cache is still valid
  if (lastRatesUpdate && (now - lastRatesUpdate < CACHE_DURATION)) {
    return exchangeRates;
  }

  // Update rates
  await updateExchangeRates();
  return exchangeRates;
}

/**
 * Convert amount from UGX to target currency
 */
async function convertCurrency(amountInUGX, targetCurrency) {
  if (targetCurrency === BASE_CURRENCY) {
    return amountInUGX; // No conversion needed
  }

  const rates = await getExchangeRates();
  const rate = rates[targetCurrency];

  if (!rate) {
    console.warn(`⚠️  No exchange rate for ${targetCurrency}, using UGX`);
    return amountInUGX;
  }

  const converted = amountInUGX * rate;
  console.log(`💱 Converted ${amountInUGX} UGX → ${converted.toFixed(2)} ${targetCurrency}`);
  
  return Math.round(converted * 100) / 100; // Round to 2 decimal places
}

module.exports = {
  getCurrencyFromIP,
  convertCurrency,
  getExchangeRates,
  updateExchangeRates,
  BASE_CURRENCY,
  COUNTRY_CURRENCY_MAP
};
