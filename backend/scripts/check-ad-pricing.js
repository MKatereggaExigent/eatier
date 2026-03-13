#!/usr/bin/env node

/**
 * Check Ad Pricing Configuration
 * Verifies that CPC/CPM columns exist and campaigns have pricing
 */

const pool = require('../config/database');

async function checkAdPricing() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Checking Ad Pricing Configuration\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Check 1: Do the columns exist in ad_space_tiers?
    console.log('1️⃣  Checking ad_space_tiers table columns...');
    const tierColumnsResult = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'ad_space_tiers'
        AND column_name IN ('cost_per_click', 'cost_per_impression')
      ORDER BY column_name
    `);
    
    if (tierColumnsResult.rows.length === 2) {
      console.log('   ✅ cost_per_click column exists');
      console.log('   ✅ cost_per_impression column exists\n');
    } else {
      console.log('   ❌ MISSING COLUMNS in ad_space_tiers!');
      console.log('   Expected: cost_per_click, cost_per_impression');
      console.log(`   Found: ${tierColumnsResult.rows.map(r => r.column_name).join(', ')}\n`);
      console.log('   🔧 FIX: Run migration 033_add_cpc_cpm_to_tiers.sql\n');
    }
    
    // Check 2: Do tiers have pricing values?
    console.log('2️⃣  Checking tier pricing values...');
    const tiersResult = await client.query(`
      SELECT name, display_name, cost_per_click, cost_per_impression
      FROM ad_space_tiers
      WHERE is_active = true
      ORDER BY sort_order
    `);
    
    console.log('   Tier Pricing:');
    tiersResult.rows.forEach(tier => {
      const cpc = tier.cost_per_click || 'NULL';
      const cpm = tier.cost_per_impression || 'NULL';
      const status = (tier.cost_per_click && tier.cost_per_impression) ? '✅' : '❌';
      console.log(`   ${status} ${tier.display_name}: CPC=R${cpc}, CPM=R${cpm}`);
    });
    console.log('');
    
    // Check 3: Do campaigns have cpc/cpm columns?
    console.log('3️⃣  Checking ad_campaigns table columns...');
    const campaignColumnsResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'ad_campaigns'
        AND column_name IN ('cpc', 'cpm')
      ORDER BY column_name
    `);
    
    if (campaignColumnsResult.rows.length === 2) {
      console.log('   ✅ cpc column exists');
      console.log('   ✅ cpm column exists\n');
    } else {
      console.log('   ❌ MISSING COLUMNS in ad_campaigns!');
      console.log('   Expected: cpc, cpm');
      console.log(`   Found: ${campaignColumnsResult.rows.map(r => r.column_name).join(', ')}\n`);
    }
    
    // Check 4: Do active campaigns have pricing?
    console.log('4️⃣  Checking active campaign pricing...');
    const campaignsResult = await client.query(`
      SELECT 
        id,
        title,
        status,
        total_budget,
        cpc,
        cpm,
        impressions,
        clicks,
        spent
      FROM ad_campaigns
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    if (campaignsResult.rows.length === 0) {
      console.log('   ⚠️  No active campaigns found\n');
    } else {
      console.log(`   Found ${campaignsResult.rows.length} active campaign(s):\n`);
      campaignsResult.rows.forEach((campaign, idx) => {
        const cpc = campaign.cpc || 'NULL';
        const cpm = campaign.cpm || 'NULL';
        const budget = campaign.total_budget || 0;
        const spent = campaign.spent || 0;
        const impressions = campaign.impressions || 0;
        const clicks = campaign.clicks || 0;
        const hasPricing = (campaign.cpc && campaign.cpm);
        const status = hasPricing ? '✅' : '❌';
        
        console.log(`   ${status} Campaign ${idx + 1}: "${campaign.title}"`);
        console.log(`      Budget: R${budget}, Spent: R${spent}`);
        console.log(`      CPC: R${cpc}, CPM: R${cpm}`);
        console.log(`      Impressions: ${impressions}, Clicks: ${clicks}\n`);
      });
    }
    
    // Check 5: Check migration status
    console.log('5️⃣  Checking migration status...');
    const migrationsResult = await client.query(`
      SELECT version, name, applied_at
      FROM schema_migrations
      WHERE name LIKE '%cpc%' OR name LIKE '%cpm%' OR version IN ('033', '035')
      ORDER BY version
    `);
    
    if (migrationsResult.rows.length > 0) {
      console.log('   Applied migrations:');
      migrationsResult.rows.forEach(m => {
        console.log(`   ✅ ${m.version} - ${m.name} (${m.applied_at})`);
      });
    } else {
      console.log('   ❌ Migrations 033 and 035 have NOT been applied!');
      console.log('   🔧 FIX: Run deployment script to apply migrations');
    }
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Check complete!\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the check
checkAdPricing();

