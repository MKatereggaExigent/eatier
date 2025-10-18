/**
 * Google My Business Integration Service
 * 
 * Automatically imports business data from Google My Business:
 * - Business profile (name, address, phone, hours, description)
 * - Reviews and ratings
 * - Photos (customer and business uploaded)
 * - Q&A
 * - Posts
 * 
 * API Documentation: https://developers.google.com/my-business/reference/rest
 */

const axios = require('axios');
const pool = require('../../config/database');

class GoogleMyBusinessService {
  constructor() {
    this.baseUrl = 'https://mybusinessbusinessinformation.googleapis.com/v1';
    this.accountManagementUrl = 'https://mybusinessaccountmanagement.googleapis.com/v1';
  }

  /**
   * Get OAuth2 authorization URL
   * User clicks this to connect their GMB account
   */
  getAuthorizationUrl(userId, tenantId) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google/callback';
    const scope = [
      'https://www.googleapis.com/auth/business.manage',
      'https://www.googleapis.com/auth/plus.business.manage'
    ].join(' ');

    const state = Buffer.from(JSON.stringify({ userId, tenantId })).toString('base64');

    return `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(scope)}&` +
      `access_type=offline&` +
      `prompt=consent&` +
      `state=${state}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code'
      });

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        token_type: response.data.token_type
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post('https://oauth2.googleapis.com/token', {
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token'
      });

      return {
        access_token: response.data.access_token,
        expires_in: response.data.expires_in
      };
    } catch (error) {
      console.error('Error refreshing token:', error.response?.data || error.message);
      throw new Error('Failed to refresh Google access token');
    }
  }

  /**
   * Get list of GMB accounts for authenticated user
   */
  async getAccounts(accessToken) {
    try {
      const response = await axios.get(`${this.accountManagementUrl}/accounts`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      return response.data.accounts || [];
    } catch (error) {
      console.error('Error fetching GMB accounts:', error.response?.data || error.message);
      throw new Error('Failed to fetch Google My Business accounts');
    }
  }

  /**
   * Get list of locations (businesses) for an account
   */
  async getLocations(accessToken, accountName) {
    try {
      const response = await axios.get(`${this.baseUrl}/${accountName}/locations`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { readMask: 'name,title,phoneNumbers,storefrontAddress,websiteUri,regularHours,profile' }
      });

      return response.data.locations || [];
    } catch (error) {
      console.error('Error fetching GMB locations:', error.response?.data || error.message);
      throw new Error('Failed to fetch Google My Business locations');
    }
  }

  /**
   * Import business profile from GMB
   */
  async importBusinessProfile(tenantId, businessId, accessToken, locationName) {
    try {
      // Get location details
      const response = await axios.get(`${this.baseUrl}/${locationName}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { readMask: 'name,title,phoneNumbers,storefrontAddress,websiteUri,regularHours,profile,categories' }
      });

      const location = response.data;

      // Map GMB data to our database schema
      const businessData = {
        business_name: location.title,
        business_type: location.categories?.primaryCategory?.displayName || 'Restaurant',
        email: location.profile?.description || '',
        contact_number: location.phoneNumbers?.primaryPhone || '',
        address: location.storefrontAddress?.addressLines?.join(', ') || '',
        city: location.storefrontAddress?.locality || '',
        state: location.storefrontAddress?.administrativeArea || '',
        zip_code: location.storefrontAddress?.postalCode || '',
        description: location.profile?.description || '',
        website: location.websiteUri || ''
      };

      // Update business in database
      await pool.query(`
        UPDATE businesses
        SET business_name = $1,
            business_type = $2,
            contact_number = $3,
            address = $4,
            city = $5,
            state = $6,
            zip_code = $7,
            description = $8,
            website = $9,
            updated_at = NOW()
        WHERE id = $10 AND tenant_id = $11
      `, [
        businessData.business_name,
        businessData.business_type,
        businessData.contact_number,
        businessData.address,
        businessData.city,
        businessData.state,
        businessData.zip_code,
        businessData.description,
        businessData.website,
        businessId,
        tenantId
      ]);

      // Import business hours
      if (location.regularHours?.periods) {
        await this.importBusinessHours(tenantId, businessId, location.regularHours.periods);
      }

      return { success: true, data: businessData };
    } catch (error) {
      console.error('Error importing business profile:', error.response?.data || error.message);
      throw new Error('Failed to import business profile from Google');
    }
  }

  /**
   * Import business hours
   */
  async importBusinessHours(tenantId, businessId, periods) {
    try {
      // Delete existing hours
      await pool.query(`
        DELETE FROM business_hours WHERE business_id = $1 AND tenant_id = $2
      `, [businessId, tenantId]);

      // Insert new hours
      const dayMap = {
        'MONDAY': 'Monday',
        'TUESDAY': 'Tuesday',
        'WEDNESDAY': 'Wednesday',
        'THURSDAY': 'Thursday',
        'FRIDAY': 'Friday',
        'SATURDAY': 'Saturday',
        'SUNDAY': 'Sunday'
      };

      for (const period of periods) {
        const dayOfWeek = dayMap[period.openDay];
        const openTime = `${period.openTime?.hours || 0}:${period.openTime?.minutes || 0}:00`;
        const closeTime = `${period.closeTime?.hours || 0}:${period.closeTime?.minutes || 0}:00`;

        await pool.query(`
          INSERT INTO business_hours (tenant_id, business_id, day_of_week, open_time, close_time, is_closed)
          VALUES ($1, $2, $3, $4, $5, false)
        `, [tenantId, businessId, dayOfWeek, openTime, closeTime]);
      }

      return { success: true };
    } catch (error) {
      console.error('Error importing business hours:', error);
      throw new Error('Failed to import business hours');
    }
  }

  /**
   * Import reviews from GMB
   */
  async importReviews(tenantId, businessId, accessToken, locationName) {
    try {
      const response = await axios.get(`${this.baseUrl}/${locationName}/reviews`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const reviews = response.data.reviews || [];
      let imported = 0;

      for (const review of reviews) {
        // Check if review already exists
        const existing = await pool.query(`
          SELECT id FROM reviews WHERE business_id = $1 AND external_id = $2
        `, [businessId, review.name]);

        if (existing.rows.length === 0) {
          // Insert new review
          await pool.query(`
            INSERT INTO reviews (
              tenant_id, business_id, external_id, reviewer_name, rating, 
              review_text, review_date, source, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'google', NOW())
          `, [
            tenantId,
            businessId,
            review.name,
            review.reviewer?.displayName || 'Anonymous',
            review.starRating === 'FIVE' ? 5 : review.starRating === 'FOUR' ? 4 : review.starRating === 'THREE' ? 3 : review.starRating === 'TWO' ? 2 : 1,
            review.comment || '',
            review.createTime
          ]);

          imported++;
        }
      }

      return { success: true, imported, total: reviews.length };
    } catch (error) {
      console.error('Error importing reviews:', error.response?.data || error.message);
      throw new Error('Failed to import reviews from Google');
    }
  }

  /**
   * Import photos from GMB
   */
  async importPhotos(tenantId, businessId, accessToken, locationName) {
    try {
      const response = await axios.get(`${this.baseUrl}/${locationName}/media`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const mediaItems = response.data.mediaItems || [];
      let imported = 0;

      for (const media of mediaItems) {
        if (media.mediaFormat === 'PHOTO') {
          // Check if photo already exists
          const existing = await pool.query(`
            SELECT id FROM business_photos WHERE business_id = $1 AND photo_url = $2
          `, [businessId, media.googleUrl]);

          if (existing.rows.length === 0) {
            // Insert new photo
            await pool.query(`
              INSERT INTO business_photos (
                tenant_id, business_id, photo_url, caption, photo_type, 
                is_primary, created_at
              ) VALUES ($1, $2, $3, $4, $5, false, NOW())
            `, [
              tenantId,
              businessId,
              media.googleUrl,
              media.description || '',
              media.category || 'general'
            ]);

            imported++;
          }
        }
      }

      return { success: true, imported, total: mediaItems.length };
    } catch (error) {
      console.error('Error importing photos:', error.response?.data || error.message);
      throw new Error('Failed to import photos from Google');
    }
  }
}

module.exports = new GoogleMyBusinessService();

