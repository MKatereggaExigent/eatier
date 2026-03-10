const pool = require('../config/database');

async function checkAds() {
  try {
    console.log('=== CHECKING AD CAMPAIGNS ===\n');
    
    // Check ad campaigns
    const campaigns = await pool.query(`
      SELECT 
        id, 
        title, 
        status, 
        is_active, 
        start_date, 
        end_date, 
        remaining_amount,
        placement_id
      FROM ad_campaigns
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${campaigns.rows.length} ad campaigns:\n`);
    campaigns.rows.forEach(ad => {
      console.log(`ID: ${ad.id}`);
      console.log(`Title: ${ad.title}`);
      console.log(`Status: ${ad.status}`);
      console.log(`Is Active: ${ad.is_active}`);
      console.log(`Start Date: ${ad.start_date}`);
      console.log(`End Date: ${ad.end_date}`);
      console.log(`Remaining Amount: ${ad.remaining_amount}`);
      console.log(`Placement ID: ${ad.placement_id}`);
      console.log('---\n');
    });
    
    // Check placements
    console.log('\n=== CHECKING AD PLACEMENTS ===\n');
    const placements = await pool.query(`
      SELECT id, name, display_name, page_location, position
      FROM ad_placements
      ORDER BY name
    `);
    
    console.log(`Found ${placements.rows.length} placements:\n`);
    placements.rows.forEach(p => {
      console.log(`ID: ${p.id}`);
      console.log(`Name: ${p.name}`);
      console.log(`Display Name: ${p.display_name}`);
      console.log(`Page Location: ${p.page_location}`);
      console.log(`Position: ${p.position}`);
      console.log('---\n');
    });
    
    // Check which ads match the query criteria
    console.log('\n=== CHECKING ACTIVE ADS (matching API query) ===\n');
    const activeAds = await pool.query(`
      SELECT
        ac.id,
        ac.title,
        ac.status,
        ac.is_active,
        ac.start_date,
        ac.end_date,
        ac.remaining_amount,
        p.name as placement_name,
        p.page_location,
        p.position
      FROM ad_campaigns ac
      LEFT JOIN ad_placements p ON ac.placement_id = p.id
      WHERE ac.status = 'active'
        AND ac.is_active = true
        AND ac.start_date <= CURRENT_TIMESTAMP
        AND (ac.end_date IS NULL OR ac.end_date >= CURRENT_TIMESTAMP)
        AND ac.remaining_amount > 0
      ORDER BY ac.created_at DESC
    `);
    
    console.log(`Found ${activeAds.rows.length} active ads matching API criteria:\n`);
    activeAds.rows.forEach(ad => {
      console.log(`ID: ${ad.id}`);
      console.log(`Title: ${ad.title}`);
      console.log(`Placement Name: ${ad.placement_name}`);
      console.log(`Page Location: ${ad.page_location}`);
      console.log(`Position: ${ad.position}`);
      console.log('---\n');
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkAds();

