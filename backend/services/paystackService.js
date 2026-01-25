/**
 * Paystack Payment Service
 * 
 * Handles all Paystack payment gateway operations including:
 * - Initialize transactions
 * - Verify transactions
 * - Handle webhooks
 * - Manage subscriptions
 */

const https = require('https');

class PaystackService {
  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY;
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
    this.baseUrl = 'api.paystack.co';
  }

  /**
   * Make a request to Paystack API
   */
  async makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        port: 443,
        path: path,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json'
        }
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseData);
            resolve(parsed);
          } catch (e) {
            reject(new Error('Failed to parse Paystack response'));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  /**
   * Initialize a transaction
   * @param {Object} params - Transaction parameters
   * @param {string} params.email - Customer email
   * @param {number} params.amount - Amount in kobo/cents (multiply by 100)
   * @param {string} params.reference - Unique transaction reference
   * @param {string} params.callback_url - URL to redirect after payment
   * @param {Object} params.metadata - Additional data to attach
   */
  async initializeTransaction({ email, amount, reference, callback_url, metadata = {} }) {
    const data = {
      email,
      amount: Math.round(amount * 100), // Convert to kobo/cents
      reference: reference || `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      callback_url: callback_url || process.env.PAYSTACK_CALLBACK_URL,
      metadata
    };

    const response = await this.makeRequest('POST', '/transaction/initialize', data);
    
    if (!response.status) {
      throw new Error(response.message || 'Failed to initialize transaction');
    }

    return {
      success: true,
      authorization_url: response.data.authorization_url,
      access_code: response.data.access_code,
      reference: response.data.reference
    };
  }

  /**
   * Verify a transaction
   * @param {string} reference - Transaction reference
   */
  async verifyTransaction(reference) {
    const response = await this.makeRequest('GET', `/transaction/verify/${reference}`);
    
    if (!response.status) {
      throw new Error(response.message || 'Failed to verify transaction');
    }

    return {
      success: true,
      status: response.data.status,
      amount: response.data.amount / 100, // Convert from kobo/cents
      currency: response.data.currency,
      reference: response.data.reference,
      customer: response.data.customer,
      paid_at: response.data.paid_at,
      channel: response.data.channel,
      metadata: response.data.metadata
    };
  }

  /**
   * Get list of banks for bank transfer
   * @param {string} country - Country code (e.g., 'south africa', 'nigeria')
   */
  async getBanks(country = 'south africa') {
    const response = await this.makeRequest('GET', `/bank?country=${encodeURIComponent(country)}`);
    
    if (!response.status) {
      throw new Error(response.message || 'Failed to fetch banks');
    }

    return response.data;
  }

  /**
   * Validate webhook signature
   * @param {string} signature - X-Paystack-Signature header
   * @param {string} payload - Raw request body
   */
  validateWebhook(signature, payload) {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');
    
    return hash === signature;
  }

  /**
   * Get public key for frontend
   */
  getPublicKey() {
    return this.publicKey;
  }
}

module.exports = new PaystackService();

