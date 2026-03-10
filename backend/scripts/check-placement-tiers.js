const pool = require('../config/database');

async function checkPlacementTiers() {
  try {
    console.log('=== AD SPACE TIERS ===\n');
    
    const tiers = await pool.query(`
      SELECT id, name, display_name, priority_weight
      FROM ad_space_tiers
      ORDER BY priority_weight DESC
    `);
    
    console.log('Tiers (by priority):\n');
    tiers.rows.forEach(tier => {
      console.log(`${tier.name} (${tier.display_name}) - Priority: ${tier.priority_weight}`);
    });
    
    console.log('\n=== PLACEMENTS BY POSITION ===\n');
    
    const placements = await pool.query(`
      SELECT 
        p.id,
        p.name,
        p.display_name,
        p.position,
        p.page_location,
        t.name as tier_name,
        t.priority_weight
      FROM ad_placements p
      LEFT JOIN ad_space_tiers t ON p.tier_id = t.id
      ORDER BY p.position, t.priority_weight DESC, p.name
    `);
    
    let currentPosition = '';
    placements.rows.forEach(p => {
      if (p.position !== currentPosition) {
        console.log(`\n--- ${p.position.toUpperCase()} ---`);
        currentPosition = p.position;
      }
      console.log(`  ${p.name} (${p.tier_name}) - ${p.page_location}`);
    });
    
    console.log('\n=== SUGGESTED FRONTEND MAPPING ===\n');
    console.log('Based on the database structure, here\'s what the frontend should use:\n');
    
    // Group by position
    const positions = {};
    placements.rows.forEach(p => {
      if (!positions[p.position]) {
        positions[p.position] = [];
      }
      positions[p.position].push(p);
    });
    
    // Suggest mappings
    Object.keys(positions).forEach(position => {
      const items = positions[position];
      const premiumItem = items.find(i => i.tier_name === 'premium');
      const standardItem = items.find(i => i.tier_name === 'standard');
      const basicItem = items.find(i => i.tier_name === 'basic');
      const featuredItem = items.find(i => i.tier_name === 'featured');
      
      console.log(`\n${position.toUpperCase()}:`);
      if (position === 'sidebar') {
        console.log(`  sidebar_left -> ${premiumItem?.name || standardItem?.name || items[0]?.name}`);
        console.log(`  sidebar_right -> ${standardItem?.name || basicItem?.name || items[1]?.name}`);
      } else if (position === 'header') {
        console.log(`  header_banner -> ${premiumItem?.name || featuredItem?.name || items[0]?.name}`);
      } else if (position === 'footer') {
        console.log(`  footer_banner -> ${premiumItem?.name || featuredItem?.name || items[0]?.name}`);
      } else if (position === 'inline') {
        console.log(`  inline_content -> ${standardItem?.name || items[0]?.name}`);
      } else if (position === 'hero') {
        console.log(`  homepage_banner -> ${premiumItem?.name || featuredItem?.name || items[0]?.name}`);
      }
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPlacementTiers();

