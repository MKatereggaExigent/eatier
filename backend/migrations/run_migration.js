/**
 * Node.js Migration Script for Digital Card Customization
 * This script adds the digital_card_customization column to the businesses table
 *
 * Usage: node run_migration.js
 */

const fs = require('fs');
const path = require('path');

// Use the existing database pool configuration
const pool = require('../config/database');

async function runMigration() {
  console.log('🚀 Starting digital card customization migration...\n');

  try {
    // Test database connection
    console.log('📡 Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Read the SQL migration file
    const sqlFilePath = path.join(__dirname, 'add_digital_card_customization.sql');
    console.log(`📄 Reading migration file: ${sqlFilePath}`);
    
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration file not found: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Execute the migration
    console.log('⚙️  Executing migration...');
    await pool.query(sqlContent);
    console.log('✅ Migration executed successfully!\n');

    // Verify the column was added
    console.log('🔍 Verifying migration...');
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'businesses' 
      AND column_name = 'digital_card_customization'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Column "digital_card_customization" verified in businesses table');
      console.log(`   Type: ${verifyResult.rows[0].data_type}\n`);
    } else {
      console.log('⚠️  Warning: Could not verify column creation\n');
    }

    // Check if index was created
    const indexResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'businesses' 
      AND indexname = 'idx_businesses_digital_card_customization'
    `);

    if (indexResult.rows.length > 0) {
      console.log('✅ Index "idx_businesses_digital_card_customization" created successfully\n');
    }

    console.log('🎉 Migration completed successfully!\n');
    console.log('You can now use the digital card customization feature.');

  } catch (error) {
    console.error('❌ Migration failed!\n');
    console.error('Error details:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Connection refused. Please check:');
      console.error('   - PostgreSQL is running');
      console.error('   - Database credentials are correct');
      console.error('   - Database host and port are correct');
    } else if (error.code === '42P07') {
      console.log('\n⚠️  Column already exists. Migration may have been run previously.');
      console.log('This is not necessarily an error.');
    } else if (error.code === '42710') {
      console.log('\n⚠️  Index already exists. Migration may have been run previously.');
      console.log('This is not necessarily an error.');
    }
    
    process.exit(1);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the migration
runMigration();

