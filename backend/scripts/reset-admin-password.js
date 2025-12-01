const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'michaelkateregga',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'itiyum_platform',
  password: process.env.DB_PASSWORD || '',
  port: process.env.DB_PORT || 5432,
});

async function resetAdminPassword() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Resetting admin password...\n');
    
    const adminPassword = 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Update admin user password
    const result = await client.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = 'admin@itiyum.com'
      RETURNING email, first_name, last_name, role
    `, [passwordHash]);
    
    if (result.rows.length > 0) {
      console.log('✅ Admin password reset successfully!');
      console.log('\n📋 Admin User Details:');
      console.log(`   Email: ${result.rows[0].email}`);
      console.log(`   Name: ${result.rows[0].first_name} ${result.rows[0].last_name}`);
      console.log(`   Role: ${result.rows[0].role}`);
      console.log(`   Password: Admin@123`);
    } else {
      console.log('❌ Admin user not found!');
    }
    
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run password reset
resetAdminPassword()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

