const pool = require('../config/database');

class AdTrackingService {
  /**
   * Track an ad impression with CPM-based cost calculation
   * @param {string} adId - Campaign ID
   * @param {Object} options - { userId, ipAddress, userAgent, placement }
   * @returns {Object} - { success, costPerImpression }
   */
  async trackImpression(adId, { userId = null, ipAddress = null, userAgent = null, placement = null } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const campaignResult = await client.query(`
        SELECT id, cpm, impressions, spent, remaining_amount, status
        FROM ad_campaigns
        WHERE id = $1 AND status = 'active'
      `, [adId]);

      if (campaignResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Campaign not found or not active' };
      }

      const campaign = campaignResult.rows[0];
      const costPerImpression = campaign.cpm ? parseFloat(campaign.cpm) / 1000 : 0;

      await client.query(`
        UPDATE ad_campaigns
        SET
          impressions = impressions + 1,
          spent = spent + $2,
          remaining_amount = remaining_amount - $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [adId, costPerImpression]);

      await client.query(`
        INSERT INTO ad_impressions (campaign_id, user_id, ip_address, user_agent, placement)
        VALUES ($1, $2, $3, $4, $5)
      `, [adId, userId, ipAddress, userAgent, placement]);

      await this.updateDailyStats(client, adId, 'impression', costPerImpression);

      await client.query('COMMIT');
      return { success: true, costPerImpression };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Track an ad click with CPC-based cost calculation
   * @param {string} adId - Campaign ID
   * @param {Object} options - { userId, impressionId, ipAddress, userAgent }
   * @returns {Object} - { success, costPerClick }
   */
  async trackClick(adId, { userId = null, impressionId = null, ipAddress = null, userAgent = null } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const campaignResult = await client.query(`
        SELECT id, cpc, clicks, spent, remaining_amount, status
        FROM ad_campaigns
        WHERE id = $1 AND status = 'active'
      `, [adId]);

      if (campaignResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Campaign not found or not active' };
      }

      const campaign = campaignResult.rows[0];
      const costPerClick = campaign.cpc ? parseFloat(campaign.cpc) : 0;

      await client.query(`
        UPDATE ad_campaigns
        SET
          clicks = clicks + 1,
          spent = spent + $2,
          remaining_amount = remaining_amount - $2,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [adId, costPerClick]);

      await client.query(`
        INSERT INTO ad_clicks (campaign_id, impression_id, user_id, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `, [adId, impressionId, userId, ipAddress, userAgent]);

      await this.updateDailyStats(client, adId, 'click', costPerClick);

      await client.query('COMMIT');
      return { success: true, costPerClick };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Track an ad conversion
   * @param {string} adId - Campaign ID
   * @param {Object} options - { userId, value }
   * @returns {Object} - { success }
   */
  async trackConversion(adId, { userId = null, value = 0 } = {}) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(`
        UPDATE ad_campaigns
        SET
          conversions = conversions + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'active'
      `, [adId]);

      await this.updateDailyStats(client, adId, 'conversion', 0);

      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update daily stats (upsert)
   */
  async updateDailyStats(client, campaignId, type, cost) {
    const today = new Date().toISOString().split('T')[0];

    const impressionIncrement = type === 'impression' ? 1 : 0;
    const clickIncrement = type === 'click' ? 1 : 0;
    const conversionIncrement = type === 'conversion' ? 1 : 0;

    await client.query(`
      INSERT INTO ad_campaign_daily_stats (campaign_id, stat_date, impressions, clicks, conversions, spend, ctr)
      VALUES ($1, $2, $3, $4, $5, $6, 0)
      ON CONFLICT (campaign_id, stat_date)
      DO UPDATE SET
        impressions = ad_campaign_daily_stats.impressions + $3,
        clicks = ad_campaign_daily_stats.clicks + $4,
        conversions = ad_campaign_daily_stats.conversions + $5,
        spend = ad_campaign_daily_stats.spend + $6,
        ctr = CASE
          WHEN (ad_campaign_daily_stats.impressions + $3) > 0
          THEN ROUND(((ad_campaign_daily_stats.clicks + $4)::numeric / (ad_campaign_daily_stats.impressions + $3)::numeric * 100), 2)
          ELSE 0
        END
    `, [campaignId, today, impressionIncrement, clickIncrement, conversionIncrement, cost]);
  }
}

module.exports = new AdTrackingService();
