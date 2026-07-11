const pool = require('../config/database');

/**
 * Aggregate daily stats from ad_impressions and ad_clicks tables
 * into ad_campaign_daily_stats for accurate reporting.
 * 
 * Usage:
 *   node aggregate-daily-stats.js [YYYY-MM-DD]
 *   - If no date is provided, aggregates for yesterday
 */
async function aggregateDailyStats(date = null) {
  const targetDate = date || new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  console.log(`Aggregating daily stats for ${targetDate}...`);

  try {
    // Aggregate from ad_impressions
    const impressionStats = await pool.query(`
      SELECT 
        campaign_id,
        COUNT(*) as impressions
      FROM ad_impressions
      WHERE DATE(created_at) = $1
      GROUP BY campaign_id
    `, [targetDate]);

    // Aggregate from ad_clicks
    const clickStats = await pool.query(`
      SELECT 
        campaign_id,
        COUNT(*) as clicks
      FROM ad_clicks
      WHERE DATE(created_at) = $1
      GROUP BY campaign_id
    `, [targetDate]);

    // Build a map of click stats for quick lookup
    const clickMap = new Map();
    for (const row of clickStats.rows) {
      clickMap.set(row.campaign_id, parseInt(row.clicks));
    }

    // Upsert stats for each campaign with impressions
    let updatedCount = 0;
    for (const row of impressionStats.rows) {
      const impressions = parseInt(row.impressions);
      const clicks = clickMap.get(row.campaign_id) || 0;
      const ctr = impressions > 0 ? (clicks / impressions * 100) : 0;

      await pool.query(`
        INSERT INTO ad_campaign_daily_stats (campaign_id, stat_date, impressions, clicks, ctr)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (campaign_id, stat_date)
        DO UPDATE SET
          impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks,
          ctr = EXCLUDED.ctr
      `, [row.campaign_id, targetDate, impressions, clicks, ctr.toFixed(4)]);
      
      updatedCount++;
    }

    // Also handle campaigns that had clicks but no tracked impressions
    for (const [campaignId, clicks] of clickMap) {
      if (!impressionStats.rows.find(r => r.campaign_id === campaignId)) {
        await pool.query(`
          INSERT INTO ad_campaign_daily_stats (campaign_id, stat_date, impressions, clicks, ctr)
          VALUES ($1, $2, 0, $3, 0)
          ON CONFLICT (campaign_id, stat_date)
          DO UPDATE SET
            clicks = EXCLUDED.clicks
        `, [campaignId, targetDate, clicks]);
        
        updatedCount++;
      }
    }

    console.log(`Aggregated stats for ${updatedCount} campaigns on ${targetDate}`);
    return { success: true, date: targetDate, campaignsUpdated: updatedCount };
  } catch (error) {
    console.error('Error aggregating daily stats:', error);
    throw error;
  }
}

/**
 * Aggregate stats for a date range
 */
async function aggregateDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const results = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const result = await aggregateDailyStats(dateStr);
    results.push(result);
  }

  return results;
}

module.exports = { aggregateDailyStats, aggregateDateRange };

// Run directly
if (require.main === module) {
  const arg = process.argv[2];
  
  if (arg && arg.includes(':')) {
    // Date range format: YYYY-MM-DD:YYYY-MM-DD
    const [start, end] = arg.split(':');
    aggregateDateRange(start, end)
      .then(() => process.exit(0))
      .catch(err => { console.error(err); process.exit(1); });
  } else {
    // Single date or default (yesterday)
    aggregateDailyStats(arg)
      .then(() => process.exit(0))
      .catch(err => { console.error(err); process.exit(1); });
  }
}
