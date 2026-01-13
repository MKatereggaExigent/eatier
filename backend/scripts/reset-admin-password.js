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
    console.log('🔐 Resetting admin password and role...\n');

    const adminPassword = 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Update admin user password
    const result = await client.query(`
      UPDATE users
      SET password_hash = $1
      WHERE email = 'admin@itiyum.com'
      RETURNING id, email, first_name, last_name
    `, [passwordHash]);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('✅ Admin password reset successfully!');

      // Now fix the role assignment
      // First, get the "Itiyum Admin" role ID
      const roleResult = await client.query(
        "SELECT id FROM roles WHERE name = 'Itiyum Admin' LIMIT 1"
      );

      if (roleResult.rows.length > 0) {
        const roleId = roleResult.rows[0].id;

        // Remove any existing role assignments for this user
        await client.query(
          "DELETE FROM user_roles WHERE user_id = $1",
          [user.id]
        );

        // Assign the admin role
        await client.query(
          "INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)",
          [user.id, roleId]
        );

        console.log('✅ Admin role assigned successfully!');
      } else {
        console.log('⚠️ Itiyum Admin role not found in database');
      }

      // Verify the role assignment
      const verifyResult = await client.query(`
        SELECT u.email, u.first_name, u.last_name,
               ARRAY_AGG(r.name) as roles
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = 'admin@itiyum.com'
        GROUP BY u.id, u.email, u.first_name, u.last_name
      `);

      if (verifyResult.rows.length > 0) {
        const admin = verifyResult.rows[0];
        console.log('\n📋 Admin User Details:');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Name: ${admin.first_name} ${admin.last_name}`);
        console.log(`   Roles: ${admin.roles.join(', ')}`);
        console.log(`   Password: Admin@123`);
      }
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

