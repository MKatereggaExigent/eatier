/**
 * Test Database Connection and Check Business Data
 * This script verifies database connectivity and checks if business data is being saved
 */

const pool = require('../config/database');

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic Connection');
    const timeResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`   Current time: ${timeResult.rows[0].now}\n`);

    // Test 2: Check if businesses table exists
    console.log('Test 2: Check businesses table');
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'businesses'
      )
    `);
    console.log(`✅ Businesses table exists: ${tableCheck.rows[0].exists}\n`);

    // Test 3: Count businesses
    console.log('Test 3: Count businesses');
    const countResult = await pool.query('SELECT COUNT(*) FROM businesses');
    console.log(`✅ Total businesses: ${countResult.rows[0].count}\n`);

    // Test 4: List all businesses with key fields
    console.log('Test 4: List all businesses');
    const businessesResult = await pool.query(`
      SELECT 
        id, 
        business_name, 
        email, 
        city, 
        state, 
        postal_code,
        website,
        facilities,
        created_at,
        updated_at
      FROM businesses
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    
    if (businessesResult.rows.length === 0) {
      console.log('⚠️  No businesses found in database\n');
    } else {
      console.log(`✅ Found ${businessesResult.rows.length} businesses:\n`);
      businessesResult.rows.forEach((business, index) => {
        console.log(`   ${index + 1}. ${business.business_name}`);
        console.log(`      ID: ${business.id}`);
        console.log(`      Email: ${business.email || 'N/A'}`);
        console.log(`      City: ${business.city || 'N/A'}`);
        console.log(`      State: ${business.state || 'N/A'}`);
        console.log(`      Postal Code: ${business.postal_code || 'N/A'}`);
        console.log(`      Website: ${business.website || 'N/A'}`);
        console.log(`      Facilities: ${JSON.stringify(business.facilities) || 'N/A'}`);
        console.log(`      Created: ${business.created_at}`);
        console.log(`      Updated: ${business.updated_at}\n`);
      });
    }

    // Test 5: Check business_hours table
    console.log('Test 5: Check business_hours table');
    const hoursTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'business_hours'
      )
    `);
    console.log(`✅ Business_hours table exists: ${hoursTableCheck.rows[0].exists}`);

    const hoursCount = await pool.query('SELECT COUNT(*) FROM business_hours');
    console.log(`✅ Total business hours records: ${hoursCount.rows[0].count}\n`);

    // Test 6: Check specific business by ID (if provided)
    const testBusinessId = process.argv[2];
    if (testBusinessId) {
      console.log(`Test 6: Check specific business (${testBusinessId})`);
      const specificBusiness = await pool.query(`
        SELECT * FROM businesses WHERE id = $1
      `, [testBusinessId]);

      if (specificBusiness.rows.length === 0) {
        console.log(`❌ Business with ID ${testBusinessId} not found\n`);
      } else {
        console.log('✅ Business found:');
        console.log(JSON.stringify(specificBusiness.rows[0], null, 2));
        console.log('');

        // Check hours for this business
        const businessHours = await pool.query(`
          SELECT * FROM business_hours WHERE business_id = $1 ORDER BY day_of_week
        `, [testBusinessId]);
        console.log(`   Business hours records: ${businessHours.rows.length}`);
        if (businessHours.rows.length > 0) {
          businessHours.rows.forEach(hour => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            console.log(`   ${days[hour.day_of_week]}: ${hour.is_closed ? 'Closed' : `${hour.open_time} - ${hour.close_time}`}`);
          });
        }
      }
    }

    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testDatabaseConnection();

