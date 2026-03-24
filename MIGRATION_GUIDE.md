# 🗄️ Database Migration Guide - Itiyum Platform

This guide explains how to run database migrations for the Itiyum platform.

---

## 📋 Quick Reference

### **On the Server (Production - Docker)**
```bash
cd ~/eatier
./run_all_migrations.sh --docker
```

### **Locally (Development)**
```bash
cd ~/Documents/Github/eatier
./run_all_migrations.sh
```

### **Check Migration Status**
```bash
./run_all_migrations.sh --docker --status
```

---

## 🚀 Available Migration Scripts

You have **3 ways** to run migrations:

### **1. Simple Bash Script (Recommended)** ⭐
```bash
# Run all pending migrations (Docker)
./run_all_migrations.sh --docker

# Run all pending migrations (Local)
./run_all_migrations.sh

# Show migration status
./run_all_migrations.sh --docker --status
```

### **2. Using npm (Inside Docker)**
```bash
# Run migrations
docker exec itiyum-backend npm run migrate

# Show status
docker exec itiyum-backend npm run migrate:status

# Force run (dangerous!)
docker exec itiyum-backend npm run migrate:force
```

### **3. Using the Backend Script Directly**
```bash
cd backend
./scripts/db-migrate.sh
```

---

## 📁 Migration Files Location

All migration files are in:
```
backend/scripts/migrations/
├── 000_create_migrations_table.sql
├── 001_ensure_all_columns.sql
├── 002_ensure_all_tables.sql
├── ...
├── 037_social_and_messaging_system.sql
├── 038_presence_and_enhanced_messaging.sql
└── ...
```

---

## 🔍 How Migrations Work

1. **Tracking**: The `schema_migrations` table tracks which migrations have been applied
2. **Ordering**: Migrations run in numerical order (001, 002, 003, etc.)
3. **Idempotent**: Already-applied migrations are skipped
4. **Transactional**: Each migration runs in a transaction (rolls back on failure)

---

## 📊 Common Commands

### **Check Migration Status**
```bash
# Docker
./run_all_migrations.sh --docker --status

# Local
cd backend && node scripts/db-migrate.js --status
```

### **Run All Pending Migrations**
```bash
# Docker (Production)
./run_all_migrations.sh --docker

# Local (Development)
./run_all_migrations.sh
```

### **Force Continue on Failure**
```bash
./run_all_migrations.sh --docker --force
```

---

## 🛠️ Troubleshooting

### **Problem: "itiyum-backend container is not running"**
```bash
# Start the backend first
docker compose up -d

# Then run migrations
./run_all_migrations.sh --docker
```

### **Problem: "Database connection failed"**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check PostgreSQL logs
docker logs itiyum-postgres --tail 50

# Verify database is ready
docker exec itiyum-postgres pg_isready -U itiyum_user
```

### **Problem: Migration fails with SQL error**
```bash
# Check the specific migration file
cat backend/scripts/migrations/XXX_migration_name.sql

# Check backend logs
docker logs itiyum-backend --tail 100

# Connect to database to investigate
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform
```

### **Problem: "Migration already applied but table doesn't exist"**
This means the migration was recorded but didn't actually complete. You can:

```bash
# Option 1: Manually remove the migration record
docker exec -it itiyum-postgres psql -U itiyum_user -d itiyum_platform
DELETE FROM schema_migrations WHERE version = 'XXX';

# Option 2: Manually run the SQL file
docker exec -i itiyum-postgres psql -U itiyum_user -d itiyum_platform < backend/scripts/migrations/XXX_migration.sql
```

---

## 📝 Creating New Migrations

To create a new migration:

1. **Create a new SQL file** with the next number:
   ```bash
   touch backend/scripts/migrations/039_your_migration_name.sql
   ```

2. **Write your SQL**:
   ```sql
   -- Migration: Your migration description
   -- Created: 2026-03-24
   
   CREATE TABLE IF NOT EXISTS your_table (
       id SERIAL PRIMARY KEY,
       name VARCHAR(255) NOT NULL
   );
   ```

3. **Run the migration**:
   ```bash
   ./run_all_migrations.sh --docker
   ```

---

## ✅ Best Practices

1. **Always backup before migrations** (especially in production)
2. **Test migrations locally first** before running on production
3. **Use transactions** (already handled by the migration runner)
4. **Make migrations idempotent** (use `IF NOT EXISTS`, `IF EXISTS`, etc.)
5. **Never modify existing migrations** that have been applied
6. **Check migration status** before and after running

---

## 🎯 Production Deployment Workflow

When deploying to production:

```bash
# 1. SSH to server
ssh aidocumines@datasqan.com

# 2. Navigate to project
cd ~/eatier

# 3. Pull latest code
git pull origin development-v2

# 4. Check migration status
./run_all_migrations.sh --docker --status

# 5. Run migrations
./run_all_migrations.sh --docker

# 6. Restart backend (if needed)
docker restart itiyum-backend

# 7. Verify
docker logs itiyum-backend --tail 50
```

---

## 📞 Need Help?

If migrations fail:
1. Check the error message carefully
2. Look at the specific migration file that failed
3. Check database logs: `docker logs itiyum-postgres`
4. Check backend logs: `docker logs itiyum-backend`
5. Verify database connectivity

---

**Last Updated**: 2026-03-24

