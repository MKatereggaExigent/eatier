const pool = require('../config/database');

async function checkAllAds() {
  try {
    console.log('=== ALL AD CAMPAIGNS ===\n');
    
    const campaigns = await pool.query(`
      SELECT 
        ac.id,
        ac.title,
        ac.status,
        ac.is_active,
        ac.start_date,
        ac.end_date,
        ac.remaining_amount,
        p.name as placement_name,
        p.position,
        p.page_location,
        t.name as tier_name,
        t.priority_weight
      FROM ad_campaigns ac
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      ORDER BY ac.created_at DESC
    `);
    
    console.log(`Found ${campaigns.rows.length} total ad campaigns:\n`);
    
    campaigns.rows.forEach(ad => {
      console.log(`📢 ${ad.title}`);
      console.log(`   Status: ${ad.status} | Active: ${ad.is_active}`);
      console.log(`   Placement: ${ad.placement_name} (${ad.position} @ ${ad.page_location})`);
      console.log(`   Tier: ${ad.tier_name} (priority: ${ad.priority_weight})`);
      console.log(`   Start: ${ad.start_date} | End: ${ad.end_date}`);
      console.log(`   Budget: $${ad.remaining_amount}`);
      console.log('---\n');
    });
    
    console.log('\n=== ACTIVE ADS BY POSITION ===\n');
    
    const activeByPosition = await pool.query(`
      SELECT 
        p.position,
        p.page_location,
        t.name as tier_name,
        COUNT(*) as ad_count
      FROM ad_campaigns ac
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      WHERE ac.status = 'active'
        AND ac.is_active = true
        AND ac.start_date <= CURRENT_TIMESTAMP
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
        AND ac.remaining_amount > 0
      GROUP BY p.position, p.page_location, t.name
      ORDER BY p.position, t.name
    `);
    
    console.log('Active ads grouped by position and tier:\n');
    activeByPosition.rows.forEach(row => {
      console.log(`${row.position} @ ${row.page_location} (${row.tier_name}): ${row.ad_count} ads`);
    });
    
    console.log('\n=== FRONTEND PLACEMENT MAPPING ===\n');
    
    const frontendPlacements = [
      { frontend: 'sidebar_left', position: 'sidebar', page_location: 'all_pages', tier: 'standard' },
      { frontend: 'sidebar_right', position: 'sidebar', page_location: 'all_pages', tier: 'premium' },
      { frontend: 'header_banner', position: 'header', page_location: 'homepage', tier: 'premium' },
      { frontend: 'footer_banner', position: 'footer', page_location: 'all_pages', tier: 'premium' },
      { frontend: 'inline_content', position: 'inline', page_location: 'all_pages', tier: 'standard' },
      { frontend: 'homepage_banner', position: 'hero', page_location: 'homepage', tier: 'premium' }
    ];
    
    for (const fp of frontendPlacements) {
      const result = await pool.query(`
        SELECT COUNT(*) as count
        FROM ad_campaigns ac
        LEFT JOIN ad_placements p ON ac.placement_id = p.id
        LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
        WHERE ac.status = 'active'
          AND ac.is_active = true
          AND ac.start_date <= CURRENT_TIMESTAMP
          AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
          AND ac.remaining_amount > 0
          AND p.position = $1
          AND p.page_location = $2
          AND t.name = $3
      `, [fp.position, fp.page_location, fp.tier]);
      
      const count = result.rows[0].count;
      const status = count > 0 ? '✅' : '❌';
      console.log(`${status} ${fp.frontend}: ${count} ads (${fp.position} @ ${fp.page_location}, tier: ${fp.tier})`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAllAds();

