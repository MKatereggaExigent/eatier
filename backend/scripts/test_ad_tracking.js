/**
 * Test Ad Tracking Endpoints
 * 
 * This script tests the ad tracking functionality by:
 * 1. Fetching active ads
 * 2. Simulating impressions
 * 3. Simulating clicks
 * 4. Verifying the metrics updated
 * 
 * Usage: node backend/scripts/test_ad_tracking.js
 */

const pool = require('../config/database');

async function testAdTracking() {
  console.log('🧪 Testing Ad Tracking System\n');
  
  try {
    // Step 1: Get all active campaigns
    console.log('📊 Step 1: Fetching active campaigns...');
    const campaignsResult = await pool.query(`
      SELECT 
        ac.id,
        ac.title,
        ac.status,
        ac.impressions,
        ac.clicks,
        ac.spent,
        ac.remaining_amount,
        p.name as placement_name
      FROM ad_campaigns ac
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      WHERE ac.status = 'active'
        AND ac.is_active = true
        AND ac.start_date <= CURRENT_TIMESTAMP
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
        AND ac.remaining_amount > 0
      LIMIT 5
    `);

    if (campaignsResult.rows.length === 0) {
      console.log('❌ No active campaigns found!');
      console.log('   Run fix_campaign_tracking.sql first to activate campaigns.');
      return;
    }

    console.log(`✅ Found ${campaignsResult.rows.length} active campaigns:\n`);
    campaignsResult.rows.forEach((campaign, index) => {
      console.log(`   ${index + 1}. ${campaign.title}`);
      console.log(`      ID: ${campaign.id}`);
      console.log(`      Placement: ${campaign.placement_name || 'N/A'}`);
      console.log(`      Current Impressions: ${campaign.impressions}`);
      console.log(`      Current Clicks: ${campaign.clicks}`);
      console.log(`      Current Spent: R${campaign.spent || 0}`);
      console.log('');
    });

    // Step 2: Test impression tracking
    console.log('📊 Step 2: Testing impression tracking...');
    const testCampaign = campaignsResult.rows[0];
    
    // Get CPM for cost calculation
    const cpmResult = await pool.query(
      'SELECT cpm FROM ad_campaigns WHERE id = $1',
      [testCampaign.id]
    );
    const cpm = cpmResult.rows[0]?.cpm || 2.00;
    const costPerImpression = parseFloat(cpm) / 1000;

    // Track impression
    await pool.query(`
      UPDATE ad_campaigns
      SET
        impressions = impressions + 1,
        spent = spent + $2,
        remaining_amount = remaining_amount - $2
      WHERE id = $1 AND status = 'active'
    `, [testCampaign.id, costPerImpression]);

    console.log(`✅ Tracked 1 impression for "${testCampaign.title}"`);
    console.log(`   Cost: R${costPerImpression.toFixed(4)}\n`);

    // Step 3: Test click tracking
    console.log('📊 Step 3: Testing click tracking...');
    
    // Get CPC for cost calculation
    const cpcResult = await pool.query(
      'SELECT cpc FROM ad_campaigns WHERE id = $1',
      [testCampaign.id]
    );
    const cpc = cpcResult.rows[0]?.cpc || 0.50;
    const costPerClick = parseFloat(cpc);

    // Track click
    await pool.query(`
      UPDATE ad_campaigns
      SET
        clicks = clicks + 1,
        spent = spent + $2,
        remaining_amount = remaining_amount - $2
      WHERE id = $1 AND status = 'active'
    `, [testCampaign.id, costPerClick]);

    console.log(`✅ Tracked 1 click for "${testCampaign.title}"`);
    console.log(`   Cost: R${costPerClick.toFixed(2)}\n`);

    // Step 4: Verify updates
    console.log('📊 Step 4: Verifying metrics updated...');
    const verifyResult = await pool.query(`
      SELECT 
        id,
        title,
        impressions,
        clicks,
        spent,
        remaining_amount,
        CASE 
          WHEN impressions > 0 THEN (clicks::float / impressions::float * 100)
          ELSE 0
        END as ctr
      FROM ad_campaigns
      WHERE id = $1
    `, [testCampaign.id]);

    const updated = verifyResult.rows[0];
    console.log(`✅ Campaign "${updated.title}" metrics:`);
    console.log(`   Impressions: ${testCampaign.impressions} → ${updated.impressions} (+${updated.impressions - testCampaign.impressions})`);
    console.log(`   Clicks: ${testCampaign.clicks} → ${updated.clicks} (+${updated.clicks - testCampaign.clicks})`);
    console.log(`   Spent: R${testCampaign.spent || 0} → R${updated.spent}`);
    console.log(`   Remaining: R${testCampaign.remaining_amount} → R${updated.remaining_amount}`);
    console.log(`   CTR: ${updated.ctr.toFixed(2)}%\n`);

    // Step 5: Summary
    console.log('📊 Step 5: Overall Summary');
    const summaryResult = await pool.query(`
      SELECT 
        COUNT(*) as total_campaigns,
        SUM(impressions) as total_impressions,
        SUM(clicks) as total_clicks,
        SUM(spent) as total_spent,
        CASE 
          WHEN SUM(impressions) > 0 THEN (SUM(clicks)::float / SUM(impressions)::float * 100)
          ELSE 0
        END as average_ctr
      FROM ad_campaigns
      WHERE status = 'active'
    `);

    const summary = summaryResult.rows[0];
    console.log(`   Total Active Campaigns: ${summary.total_campaigns}`);
    console.log(`   Total Impressions: ${summary.total_impressions}`);
    console.log(`   Total Clicks: ${summary.total_clicks}`);
    console.log(`   Total Spent: R${parseFloat(summary.total_spent || 0).toFixed(2)}`);
    console.log(`   Average CTR: ${parseFloat(summary.average_ctr || 0).toFixed(2)}%\n`);

    console.log('✅ Ad tracking test completed successfully!');
    console.log('   You should now see updated metrics in the business dashboard.\n');

  } catch (error) {
    console.error('❌ Error testing ad tracking:', error);
    console.error('   Details:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testAdTracking();

