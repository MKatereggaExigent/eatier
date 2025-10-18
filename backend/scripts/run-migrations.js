const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'itiyum_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'itiyum_platform',
  password: process.env.DB_PASSWORD || 'itiyum_secure_password_2024',
  port: process.env.DB_PORT || 5432,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting database migrations...\n');
    
    // Step 1: Run schema with RBAC and multi-tenancy
    console.log('📋 Step 1: Creating schema with RBAC and multi-tenancy...');
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, 'schema-with-rbac-multitenancy.sql'),
      'utf8'
    );
    await client.query(schemaSQL);
    console.log('✅ Schema created successfully\n');
    
    // Step 2: Seed RBAC roles and permissions
    console.log('📋 Step 2: Seeding RBAC roles and permissions...');
    const seedRBACSQL = fs.readFileSync(
      path.join(__dirname, 'seed-rbac.sql'),
      'utf8'
    );
    await client.query(seedRBACSQL);
    console.log('✅ RBAC seeded successfully\n');
    
    // Step 3: Create admin user with proper password hash
    console.log('📋 Step 3: Creating admin user...');
    const adminPassword = 'Admin@123';
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    
    // Get platform tenant ID
    const tenantResult = await client.query(
      "SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1"
    );
    const tenantId = tenantResult.rows[0].id;
    
    // Update admin user with proper password hash
    await client.query(`
      UPDATE users 
      SET password_hash = $1 
      WHERE email = 'admin@itiyum.com' AND tenant_id = $2
    `, [passwordHash, tenantId]);
    
    console.log('✅ Admin user created');
    console.log('   Email: admin@itiyum.com');
    console.log('   Password: Admin@123\n');
    
    // Step 4: Refresh materialized view
    console.log('📋 Step 4: Refreshing admin statistics...');
    await client.query('REFRESH MATERIALIZED VIEW admin_statistics');
    console.log('✅ Statistics refreshed\n');
    
    // Step 5: Verify setup
    console.log('📋 Step 5: Verifying setup...');
    const stats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM tenants) as tenants_count,
        (SELECT COUNT(*) FROM roles) as roles_count,
        (SELECT COUNT(*) FROM permissions) as permissions_count,
        (SELECT COUNT(*) FROM users) as users_count,
        (SELECT COUNT(*) FROM role_permissions) as role_permissions_count
    `);
    
    console.log('✅ Setup verification:');
    console.log(`   Tenants: ${stats.rows[0].tenants_count}`);
    console.log(`   Roles: ${stats.rows[0].roles_count}`);
    console.log(`   Permissions: ${stats.rows[0].permissions_count}`);
    console.log(`   Users: ${stats.rows[0].users_count}`);
    console.log(`   Role-Permission mappings: ${stats.rows[0].role_permissions_count}\n`);
    
    console.log('🎉 Database migrations completed successfully!');
    console.log('\n📊 Multi-tenancy: ✅ Enabled');
    console.log('🔐 RBAC: ✅ Configured');
    console.log('👤 Admin user: ✅ Created\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

