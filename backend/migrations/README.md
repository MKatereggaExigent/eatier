# Database Migrations

This directory contains database migration scripts for the Itiyum platform.

## Digital Card Customization Migration

This migration adds support for storing digital business card customization settings.

### What it does:
- Adds `digital_card_customization` JSONB column to the `businesses` table
- Creates a GIN index for faster JSON queries
- Allows businesses to save custom colors, layout, and content preferences

### How to run:

#### Option 1: Node.js Script (Recommended - Works Everywhere)

```bash
cd backend/migrations
node run_migration.js
```

**Advantages:**
- Works on all platforms (macOS, Linux, Windows)
- No need for PostgreSQL client tools
- Better error messages
- Automatic verification

#### Option 2: Bash Script (Linux/macOS with psql installed)

```bash
cd backend/migrations
./run_migration.sh
```

#### Option 3: Direct SQL (If you have psql)

```bash
cd backend/migrations
psql -U postgres -d itiyum_db -f add_digital_card_customization.sql
```

#### Option 4: Using existing database connection

If your PostgreSQL is running on a different host or port, set environment variables:

```bash
# Set environment variables
export DB_USER=postgres
export DB_NAME=itiyum_db
export DB_HOST=localhost
export DB_PORT=5432
export DB_PASSWORD=your_password

# Run the Node.js migration
node run_migration.js
```

### Troubleshooting:

#### "psql: command not found" on macOS

Install PostgreSQL client tools:
```bash
# Using Homebrew
brew install postgresql

# Or use the Node.js script instead
node run_migration.js
```

#### "Connection refused"

1. Check if PostgreSQL is running:
   ```bash
   # macOS
   brew services list | grep postgresql
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Check your database configuration in `backend/config/database.js`

3. Try using Unix socket instead of TCP:
   ```bash
   psql -U postgres -d itiyum_db -f add_digital_card_customization.sql
   ```

#### "Column already exists"

The migration has already been run. This is not an error - you can safely ignore this message.

### Verification:

After running the migration, verify it worked:

```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'businesses' 
AND column_name = 'digital_card_customization';

-- Check if index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'businesses' 
AND indexname = 'idx_businesses_digital_card_customization';
```

### Rollback (if needed):

If you need to rollback this migration:

```sql
-- Remove the index
DROP INDEX IF EXISTS idx_businesses_digital_card_customization;

-- Remove the column
ALTER TABLE businesses DROP COLUMN IF EXISTS digital_card_customization;
```

## Migration Structure

The `digital_card_customization` column stores JSON data in this format:

```json
{
  "primaryColor": "#667eea",
  "secondaryColor": "#764ba2",
  "logoPosition": "top",
  "includeQR": true,
  "includeContact": true,
  "includeSocial": true
}
```

### Fields:
- `primaryColor` (string): Hex color code for primary gradient color
- `secondaryColor` (string): Hex color code for secondary gradient color
- `logoPosition` (string): One of "top", "center", or "bottom"
- `includeQR` (boolean): Whether to include QR code on the card
- `includeContact` (boolean): Whether to include contact information
- `includeSocial` (boolean): Whether to include social media links

