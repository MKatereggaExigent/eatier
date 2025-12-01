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

// Define all demo users and their passwords
const demoUsers = [
  { email: 'admin@itiyum.com', password: 'Admin@123' },
  { email: 'admin@example.com', password: 'password123' },
  { email: 'business@example.com', password: 'password123' },
  { email: 'user@example.com', password: 'password123' },
  { email: 'normaluser@example.com', password: 'password123' },
  { email: 'chef@example.com', password: 'password123' },
  { email: 'restaurant.owner@demo.com', password: 'Demo@123' },
  { email: 'cafe.owner@demo.com', password: 'Demo@123' },
  { email: 'catering.owner@demo.com', password: 'Demo@123' },
  { email: 'foodie1@demo.com', password: 'Demo@123' },
  { email: 'foodie2@demo.com', password: 'Demo@123' },
  { email: 'chef1@demo.com', password: 'Demo@123' },
  { email: 'waiter1@demo.com', password: 'Demo@123' },
  { email: 'user1@demo.com', password: 'Demo@123' },
  { email: 'user2@demo.com', password: 'Demo@123' },
  { email: 'customer1@demo.com', password: 'Demo@123' },
  { email: 'customer2@demo.com', password: 'Demo@123' },
];

async function resetAllPasswords() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Resetting all demo user passwords...\n');
    
    let successCount = 0;
    let notFoundCount = 0;
    
    for (const user of demoUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      const result = await client.query(`
        UPDATE users 
        SET password_hash = $1 
        WHERE email = $2
        RETURNING email, first_name, last_name, role
      `, [passwordHash, user.email]);
      
      if (result.rows.length > 0) {
        const userData = result.rows[0];
        console.log(`✅ ${userData.email.padEnd(30)} | ${user.password.padEnd(15)} | ${userData.role}`);
        successCount++;
      } else {
        console.log(`⚠️  ${user.email.padEnd(30)} | NOT FOUND`);
        notFoundCount++;
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ Successfully reset: ${successCount} users`);
    if (notFoundCount > 0) {
      console.log(`⚠️  Not found: ${notFoundCount} users`);
    }
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('❌ Password reset failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run password reset
resetAllPasswords()
  .then(() => {
    console.log('\n✨ All demo passwords have been reset!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

