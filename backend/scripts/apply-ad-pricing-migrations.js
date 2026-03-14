#!/usr/bin/env node

/**
 * Manually apply ad pricing migrations (033 and 035)
 * This is a one-time fix to apply the CPC/CPM pricing migrations
 */

const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function applyAdPricingMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('\n🚀 Applying Ad Pricing Migrations\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Migration 033: Add CPC/CPM columns to ad_space_tiers
    console.log('1️⃣  Running Migration 033: Add CPC/CPM to tiers...');
    const migration033Path = path.join(__dirname, 'migrations', '033_add_cpc_cpm_to_tiers.sql');
    const migration033SQL = fs.readFileSync(migration033Path, 'utf8');
    
    try {
      await client.query('BEGIN');
      await client.query(migration033SQL);
      
      // Record in schema_migrations
      await client.query(`
        INSERT INTO schema_migrations (version, name, checksum, execution_time_ms)
        VALUES ('033', '033_add_cpc_cpm_to_tiers.sql', 'manual', 0)
        ON CONFLICT (version) DO NOTHING
      `);
      
      await client.query('COMMIT');
      console.log('   ✅ Migration 033 applied successfully!\n');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('   ❌ Migration 033 failed:', error.message);
      throw error;
    }
    
    // Verify columns were added
    console.log('2️⃣  Verifying tier columns...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'ad_space_tiers'
        AND column_name IN ('cost_per_click', 'cost_per_impression')
      ORDER BY column_name
    `);
    
    if (columnsResult.rows.length === 2) {
      console.log('   ✅ cost_per_click column exists');
      console.log('   ✅ cost_per_impression column exists\n');
    } else {
      throw new Error('Columns were not created!');
    }
    
    // Check tier pricing
    console.log('3️⃣  Checking tier pricing values...');
    const tiersResult = await client.query(`
      SELECT name, display_name, cost_per_click, cost_per_impression
      FROM ad_space_tiers
      WHERE is_active = true
      ORDER BY sort_order
    `);
    
    tiersResult.rows.forEach(tier => {
      console.log(`   ✅ ${tier.display_name}: CPC=R${tier.cost_per_click}, CPM=R${tier.cost_per_impression}`);
    });
    console.log('');
    
    // Migration 035: Update existing campaigns with CPC/CPM
    console.log('4️⃣  Running Migration 035: Update campaigns with pricing...');
    const migration035Path = path.join(__dirname, 'migrations', '035_update_existing_campaigns_with_cpc_cpm.sql');
    const migration035SQL = fs.readFileSync(migration035Path, 'utf8');
    
    try {
      await client.query('BEGIN');
      await client.query(migration035SQL);
      
      // Record in schema_migrations
      await client.query(`
        INSERT INTO schema_migrations (version, name, checksum, execution_time_ms)
        VALUES ('035', '035_update_existing_campaigns_with_cpc_cpm.sql', 'manual', 0)
        ON CONFLICT (version) DO NOTHING
      `);
      
      await client.query('COMMIT');
      console.log('   ✅ Migration 035 applied successfully!\n');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('   ❌ Migration 035 failed:', error.message);
      throw error;
    }
    
    // Verify campaigns have pricing
    console.log('5️⃣  Verifying campaign pricing...');
    const campaignsResult = await client.query(`
      SELECT 
        id,
        title,
        status,
        cpc,
        cpm,
        total_budget,
        spent,
        impressions,
        clicks
      FROM ad_campaigns
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (campaignsResult.rows.length === 0) {
      console.log('   ⚠️  No active campaigns found\n');
    } else {
      console.log(`   Found ${campaignsResult.rows.length} active campaign(s):\n`);
      campaignsResult.rows.forEach((campaign, idx) => {
        const cpc = campaign.cpc || 'NULL';
        const cpm = campaign.cpm || 'NULL';
        const hasPricing = (campaign.cpc && campaign.cpm);
        const status = hasPricing ? '✅' : '⚠️';
        
        console.log(`   ${status} "${campaign.title}"`);
        console.log(`      CPC: R${cpc}, CPM: R${cpm}`);
        console.log(`      Budget: R${campaign.total_budget || 0}, Spent: R${campaign.spent || 0}`);
        console.log(`      Impressions: ${campaign.impressions || 0}, Clicks: ${campaign.clicks || 0}\n`);
      });
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Ad pricing migrations applied successfully!\n');
    console.log('📊 Next steps:');
    console.log('   1. Restart the backend: docker restart itiyum-backend');
    console.log('   2. View ads on the website to generate impressions');
    console.log('   3. Click ads to generate clicks');
    console.log('   4. Check https://itiyum.com/business/ads for metrics\n');
    
  } catch (error) {
    console.error('\n❌ Error applying migrations:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migrations
applyAdPricingMigrations();

