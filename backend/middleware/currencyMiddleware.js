const { getCurrencyFromIP } = require('../services/currencyService');

/**
 * Middleware to detect user's currency based on IP address
 * Attaches currency info to req.userCurrency
 */
function detectCurrency(req, res, next) {
  try {
    // Get client IP address
    const ip = req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               '127.0.0.1';

    // Clean IP (remove IPv6 prefix if present)
    const cleanIP = ip.replace('::ffff:', '');

    // Get currency from IP
    const currencyInfo = getCurrencyFromIP(cleanIP);

    // Attach to request
    req.userCurrency = {
      currency: currencyInfo.currency,
      country: currencyInfo.country,
      ip: cleanIP
    };

    // Log for debugging
    console.log(`💱 User currency detected: ${currencyInfo.currency} (${currencyInfo.country}) from IP: ${cleanIP}`);

    // Also allow override from header (for testing)
    const currencyOverride = req.headers['x-currency'];
    if (currencyOverride) {
      console.log('💱 Currency override from header:', currencyOverride);
      req.userCurrency.currency = currencyOverride;
    }

    next();
  } catch (error) {
    console.error('Error in currency middleware:', error);
    // Fallback to default
    req.userCurrency = {
      currency: 'UGX',
      country: 'UG',
      ip: 'unknown'
    };
    next();
  }
}

module.exports = { detectCurrency };
