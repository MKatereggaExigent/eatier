const axios = require('axios');

// Google Maps API configuration
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE';

// Delivery fee configuration
const BASE_DELIVERY_FEE = 2000; // 2000 ZAR base fee
const PRICE_PER_KM = 500; // 500 ZAR per kilometer
const MIN_DELIVERY_FEE = 2000; // Minimum delivery fee
const MAX_DELIVERY_FEE = 15000; // Maximum delivery fee

// Rate limiting to stay within free tier (40,000 requests/month)
const DAILY_REQUEST_LIMIT = 1300; // ~40,000/month ÷ 30 days
let requestCount = 0;
let lastResetDate = new Date().toDateString();

/**
 * Check if we're within daily API request limits
 * Prevents exceeding Google Maps free tier
 */
function checkRateLimit() {
  const today = new Date().toDateString();

  // Reset counter at midnight
  if (today !== lastResetDate) {
    console.log(`📊 Resetting API request counter. Yesterday: ${requestCount} requests`);
    requestCount = 0;
    lastResetDate = today;
  }

  // Check if over limit
  if (requestCount >= DAILY_REQUEST_LIMIT) {
    console.error('⚠️  DAILY GOOGLE MAPS API LIMIT REACHED!');
    console.error(`   Used ${requestCount}/${DAILY_REQUEST_LIMIT} requests today`);
    console.error('   Returning fallback values to prevent charges');
    throw new Error('Daily API limit reached');
  }

  requestCount++;
  const percentUsed = ((requestCount / DAILY_REQUEST_LIMIT) * 100).toFixed(1);
  console.log(`📊 Google Maps API: ${requestCount}/${DAILY_REQUEST_LIMIT} requests today (${percentUsed}%)`);
}

/**
 * Calculate distance between two addresses using Google Maps Distance Matrix API
 * @param {string} origin - Starting address (restaurant address)
 * @param {string} destination - Destination address (customer address)
 * @returns {Promise<{distanceKm: number, deliveryFee: number, duration: string}>}
 */
async function calculateDeliveryFee(origin, destination) {
  try {
    console.log('📍 Calculating distance between:');
    console.log('  Origin:', origin);
    console.log('  Destination:', destination);

    // If Google Maps API key is not configured, use default fee
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE') {
      console.warn('⚠️  Google Maps API key not configured. Using default delivery fee.');
      return {
        distanceKm: 5, // Default 5km
        deliveryFee: BASE_DELIVERY_FEE + (5 * PRICE_PER_KM), // 2000 + 2500 = 4500 UGX
        duration: '20-30 mins',
        error: 'API key not configured'
      };
    }

    // Check rate limit BEFORE making API call
    checkRateLimit();

    // Call Google Maps Distance Matrix API
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origin,
        destinations: destination,
        key: GOOGLE_MAPS_API_KEY,
        mode: 'driving', // or 'walking', 'bicycling', 'transit'
        units: 'metric'
      }
    });

    console.log('🗺️  Google Maps API response:', JSON.stringify(response.data, null, 2));

    // Check if API call was successful
    if (response.data.status !== 'OK') {
      console.error('❌ Google Maps API error:', response.data.status);
      console.error('   Error message:', response.data.error_message);
      
      // Fallback to default fee
      return {
        distanceKm: 5,
        deliveryFee: BASE_DELIVERY_FEE + (5 * PRICE_PER_KM),
        duration: '20-30 mins',
        error: response.data.status
      };
    }

    // Extract distance and duration
    const element = response.data.rows[0].elements[0];

    if (element.status !== 'OK') {
      console.error('❌ Could not calculate distance:', element.status);
      
      // Fallback to default fee
      return {
        distanceKm: 5,
        deliveryFee: BASE_DELIVERY_FEE + (5 * PRICE_PER_KM),
        duration: '20-30 mins',
        error: element.status
      };
    }

    // Distance in meters, convert to kilometers
    const distanceMeters = element.distance.value;
    const distanceKm = (distanceMeters / 1000).toFixed(2);
    const duration = element.duration.text;

    console.log(`✅ Distance: ${distanceKm} km`);
    console.log(`⏱️  Duration: ${duration}`);

    // Calculate delivery fee based on distance
    // Formula: BASE_FEE + (distance_km * PRICE_PER_KM)
    let deliveryFee = BASE_DELIVERY_FEE + (parseFloat(distanceKm) * PRICE_PER_KM);

    // Apply min/max limits
    deliveryFee = Math.max(MIN_DELIVERY_FEE, deliveryFee);
    deliveryFee = Math.min(MAX_DELIVERY_FEE, deliveryFee);

    // Round to nearest 100 UGX
    deliveryFee = Math.round(deliveryFee / 100) * 100;

    console.log(`💰 Calculated delivery fee: ${deliveryFee} UGX`);
    console.log(`   Formula: ${BASE_DELIVERY_FEE} (base) + (${distanceKm} km × ${PRICE_PER_KM} UGX/km)`);

    return {
      distanceKm: parseFloat(distanceKm),
      deliveryFee: deliveryFee,
      duration: duration,
      distanceText: element.distance.text
    };

  } catch (error) {
    console.error('❌ Error calculating delivery fee:', error.message);
    console.error('   Stack:', error.stack);

    // Fallback to default fee on error
    return {
      distanceKm: 5,
      deliveryFee: BASE_DELIVERY_FEE + (5 * PRICE_PER_KM),
      duration: '20-30 mins',
      error: error.message
    };
  }
}

/**
 * Format address for Google Maps API
 * @param {Object|string} address - Address object or string
 * @returns {string} Formatted address string
 */
function formatAddress(address) {
  if (typeof address === 'string') {
    return address;
  }

  if (typeof address === 'object' && address !== null) {
    // Handle structured address object
    const parts = [
      address.street,
      address.city,
      address.state,
      address.postalCode,
      address.country || 'Uganda'
    ].filter(Boolean);

    return parts.join(', ');
  }

  return 'Uganda'; // Fallback
}

module.exports = {
  calculateDeliveryFee,
  formatAddress,
  BASE_DELIVERY_FEE,
  PRICE_PER_KM,
  MIN_DELIVERY_FEE,
  MAX_DELIVERY_FEE
};
