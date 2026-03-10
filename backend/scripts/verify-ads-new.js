const pool = require('../config/database');

async function verifyAds() {
  try {
    console.log('=== VERIFYING ADS WITH NEW LOGIC (NO TIER FILTERING) ===\n');
    
    const frontendPlacements = [
      { frontend: 'sidebar_left', position: 'sidebar', page_location: 'all_pages' },
      { frontend: 'sidebar_right', position: 'sidebar', page_location: 'all_pages' },
      { frontend: 'header_banner', position: 'header', page_location: 'homepage' },
      { frontend: 'footer_banner', position: 'footer', page_location: 'all_pages' },
      { frontend: 'inline_content', position: 'inline', page_location: 'all_pages' },
      { frontend: 'homepage_banner', position: 'hero', page_location: 'homepage' }
    ];
    
    for (const fp of frontendPlacements) {
      console.log(`\n📍 ${fp.frontend.toUpperCase()}`);
      console.log(`   Looking for: position="${fp.position}", page_location="${fp.page_location}"`);
      
      const result = await pool.query(`
        SELECT
          ac.id,
          ac.title,
          ac.status,
          ac.is_active,
          ac.start_date,
          ac.end_date,
          ac.remaining_amount,
          t.name as tier_name,
          t.priority_weight as tier_priority,
          p.name as placement_name,
          p.position,
          p.page_location
        FROM ad_campaigns ac
        LEFT JOIN ad_space_tiers t ON ac.tier_id = t.id
        LEFT JOIN ad_placements p ON ac.placement_id = p.id
        WHERE ac.status = 'active'
          AND ac.is_active = true
          AND ac.start_date <= CURRENT_TIMESTAMP
          AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
          AND ac.remaining_amount > 0
          AND p.position = $1
          AND p.page_location = $2
        ORDER BY t.priority_weight DESC, ac.created_at DESC
        LIMIT 5
      `, [fp.position, fp.page_location]);
      
      if (result.rows.length > 0) {
        console.log(`   ✅ Found ${result.rows.length} ads:`);
        result.rows.forEach((ad, index) => {
          console.log(`      ${index + 1}. "${ad.title}" (${ad.tier_name} - priority ${ad.tier_priority})`);
        });
      } else {
        console.log(`   ❌ No ads found`);
      }
    }
    
    console.log('\n\n=== SUMMARY ===\n');
    console.log('Based on the new logic (no tier filtering):');
    console.log('- Both sidebars should show ALL sidebar ads (premium + basic)');
    console.log('- Header should show the header_banner_standard ad');
    console.log('- Inline content should show the inline_content_basic ad');
    console.log('- Homepage banner should show the homepage_banner_basic ad');
    console.log('- Footer has no ads yet\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyAds();

