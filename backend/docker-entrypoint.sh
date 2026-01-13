#!/bin/bash
set -e

# ===================================
# ITIYUM BACKEND DOCKER ENTRYPOINT
# Handles database initialization and admin user creation
# ===================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   ITIYUM BACKEND STARTING...${NC}"
echo -e "${BLUE}========================================${NC}"

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while ! nc -z $DB_HOST $DB_PORT; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo -e "${RED}PostgreSQL not available after $MAX_RETRIES attempts. Exiting.${NC}"
    exit 1
  fi
  echo -e "${YELLOW}Waiting for PostgreSQL... (attempt $RETRY_COUNT/$MAX_RETRIES)${NC}"
  sleep 2
done

echo -e "${GREEN}✓ PostgreSQL is available${NC}"

# Check if database is initialized (check for users table)
echo -e "${BLUE}Checking database initialization...${NC}"

# Use node to check and initialize database
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Check if users table exists
    const result = await client.query(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')\");
    const tablesExist = result.rows[0].exists;
    
    if (!tablesExist) {
      console.log('🚀 Database not initialized. Running migrations...');
      
      // Run schema
      const schemaSQL = fs.readFileSync(path.join(__dirname, 'scripts/schema-with-rbac-multitenancy.sql'), 'utf8');
      await client.query(schemaSQL);
      console.log('✅ Schema created');
      
      // Run RBAC seed
      const rbacSQL = fs.readFileSync(path.join(__dirname, 'scripts/seed-rbac.sql'), 'utf8');
      await client.query(rbacSQL);
      console.log('✅ RBAC seeded');
      
      // Hash admin password and update
      const adminPassword = 'Admin@123';
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      
      const tenantResult = await client.query(\"SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1\");
      if (tenantResult.rows.length > 0) {
        const tenantId = tenantResult.rows[0].id;
        await client.query('UPDATE users SET password_hash = \$1 WHERE email = \$2 AND tenant_id = \$3', [passwordHash, 'admin@itiyum.com', tenantId]);
        console.log('✅ Admin user created: admin@itiyum.com / Admin@123');
      }
      
      // Refresh materialized view
      await client.query('REFRESH MATERIALIZED VIEW admin_statistics');
      console.log('✅ Statistics refreshed');
      
    } else {
      console.log('✅ Database already initialized');

      // Ensure admin user exists with correct password
      const tenantResult = await client.query(\"SELECT id FROM tenants WHERE slug = 'itiyum' LIMIT 1\");
      if (tenantResult.rows.length > 0) {
        const tenantId = tenantResult.rows[0].id;
        const adminResult = await client.query('SELECT id FROM users WHERE email = \$1 AND tenant_id = \$2', ['admin@itiyum.com', tenantId]);
        const passwordHash = await bcrypt.hash('Admin@123', 10);

        if (adminResult.rows.length === 0) {
          console.log('⚠️ Admin user not found, creating...');

          // INSERT the admin user
          const insertResult = await client.query(
            'INSERT INTO users (email, password_hash, first_name, last_name, account_status, email_verified, tenant_id) VALUES (\$1, \$2, \$3, \$4, \$5, \$6, \$7) RETURNING id',
            ['admin@itiyum.com', passwordHash, 'Platform', 'Admin', 'active', true, tenantId]
          );

          // Assign Itiyum Admin role
          const roleResult = await client.query(\"SELECT id FROM roles WHERE name = 'Itiyum Admin' LIMIT 1\");
          if (roleResult.rows.length > 0 && insertResult.rows.length > 0) {
            await client.query('INSERT INTO user_roles (user_id, role_id) VALUES (\$1, \$2) ON CONFLICT DO NOTHING', [insertResult.rows[0].id, roleResult.rows[0].id]);
          }

          console.log('✅ Admin user created: admin@itiyum.com / Admin@123');
        } else {
          // Update existing admin password to ensure it's correct
          await client.query('UPDATE users SET password_hash = \$1 WHERE email = \$2 AND tenant_id = \$3', [passwordHash, 'admin@itiyum.com', tenantId]);
          console.log('✅ Admin password updated: admin@itiyum.com / Admin@123');
        }
      } else {
        console.log('⚠️ Itiyum tenant not found, cannot create admin user');
      }
    }
    
    console.log('✅ Database ready');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase();
"

if [ $? -ne 0 ]; then
  echo -e "${RED}Database initialization failed. Exiting.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Database initialization complete${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   Starting Node.js server...${NC}"
echo -e "${BLUE}========================================${NC}"

# Start the application
exec node server.js

