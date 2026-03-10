const pool = require('../config/database');

async function fixAdPlacements() {
  try {
    console.log('=== FIXING AD PLACEMENTS ===\n');
    
    // Get placement IDs
    const placements = await pool.query(`
      SELECT id, name FROM ad_placements
      WHERE name IN (
        'sidebar_standard',
        'header_banner_premium',
        'footer_banner_premium',
        'inline_content_standard',
        'homepage_banner_premium'
      )
    `);
    
    const placementMap = {};
    placements.rows.forEach(p => {
      placementMap[p.name] = p.id;
    });
    
    console.log('Available placements:');
    Object.keys(placementMap).forEach(name => {
      console.log(`  ${name}: ${placementMap[name]}`);
    });
    console.log('\n');
    
    // Update "Sensational Taste" from header_banner_standard to header_banner_premium
    if (placementMap['header_banner_premium']) {
      const result1 = await pool.query(`
        UPDATE ad_campaigns
        SET placement_id = $1
        WHERE title = 'Sensational Taste'
        RETURNING id, title
      `, [placementMap['header_banner_premium']]);
      
      if (result1.rows.length > 0) {
        console.log(`✅ Updated "${result1.rows[0].title}" to header_banner_premium`);
      }
    }
    
    // Update "Woolworths Summer Foods" from inline_content_basic to inline_content_standard
    if (placementMap['inline_content_standard']) {
      const result2 = await pool.query(`
        UPDATE ad_campaigns
        SET placement_id = $1
        WHERE title = 'Woolworths Summer Foods'
        RETURNING id, title
      `, [placementMap['inline_content_standard']]);
      
      if (result2.rows.length > 0) {
        console.log(`✅ Updated "${result2.rows[0].title}" to inline_content_standard`);
      }
    }
    
    // Update "Woolworths Foods Massive Sale" from homepage_banner_basic to homepage_banner_premium
    if (placementMap['homepage_banner_premium']) {
      const result3 = await pool.query(`
        UPDATE ad_campaigns
        SET placement_id = $1
        WHERE title = 'Woolworths Foods Massive Sale'
        RETURNING id, title
      `, [placementMap['homepage_banner_premium']]);
      
      if (result3.rows.length > 0) {
        console.log(`✅ Updated "${result3.rows[0].title}" to homepage_banner_premium`);
      }
    }
    
    // Update "Woolworths Sale" from sidebar_basic to sidebar_standard
    if (placementMap['sidebar_standard']) {
      const result4 = await pool.query(`
        UPDATE ad_campaigns
        SET placement_id = $1
        WHERE title = 'Woolworths Sale'
        RETURNING id, title
      `, [placementMap['sidebar_standard']]);
      
      if (result4.rows.length > 0) {
        console.log(`✅ Updated "${result4.rows[0].title}" to sidebar_standard`);
      }
    }
    
    console.log('\n=== VERIFICATION ===\n');
    
    // Verify the updates
    const verification = await pool.query(`
      SELECT 
        ac.title,
        p.name as placement_name,
        p.position,
        t.name as tier_name
      FROM ad_campaigns ac
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
      WHERE ac.status = 'active'
      ORDER BY p.position, t.priority_weight DESC
    `);
    
    console.log('Updated ad placements:');
    verification.rows.forEach(ad => {
      console.log(`  ${ad.title}: ${ad.placement_name} (${ad.tier_name})`);
    });
    
    console.log('\n✅ Ad placements updated successfully!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAdPlacements();

