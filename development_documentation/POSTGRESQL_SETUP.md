# PostgreSQL Setup Guide for Itiyum Platform

Since you have pgAdmin 4 installed but PostgreSQL isn't accessible from the command line, here are the steps to get PostgreSQL properly set up on your macOS system.

## Option 1: Install PostgreSQL via Homebrew (Recommended)

### Step 1: Install Homebrew (if not already installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install PostgreSQL
```bash
brew install postgresql@15
```

### Step 3: Start PostgreSQL service
```bash
brew services start postgresql@15
```

### Step 4: Add PostgreSQL to your PATH
Add this line to your `~/.zshrc` or `~/.bash_profile`:
```bash
export PATH="/opt/homebrew/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

### Step 5: Create a database user
```bash
createuser -s postgres
```

## Option 2: Install PostgreSQL.app (GUI Method)

### Step 1: Download PostgreSQL.app
- Go to https://postgresapp.com/
- Download and install PostgreSQL.app
- Launch the app and click "Initialize"

### Step 2: Add PostgreSQL to your PATH
Add this line to your `~/.zshrc` or `~/.bash_profile`:
```bash
export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Option 3: Official PostgreSQL Installer

### Step 1: Download the installer
- Go to https://www.postgresql.org/download/macos/
- Download the PostgreSQL installer for macOS
- Run the installer and follow the setup wizard

### Step 2: Add PostgreSQL to your PATH
Add this line to your `~/.zshrc` or `~/.bash_profile`:
```bash
export PATH="/Library/PostgreSQL/15/bin:$PATH"
```

Then reload your shell:
```bash
source ~/.zshrc
```

## Verify Installation

After installing PostgreSQL using any of the above methods, verify it's working:

```bash
# Check if PostgreSQL is accessible
psql --version

# Check if PostgreSQL is running
pg_isready

# Connect to PostgreSQL (should work without errors)
psql -U postgres -c "SELECT version();"
```

## Quick Setup for Itiyum Database

Once PostgreSQL is properly installed and running, you can set up the Itiyum database:

```bash
# Navigate to the database directory
cd /path/to/itiyum/database

# Run the setup script
./setup_database.sh
```

## Troubleshooting

### If you get "role postgres does not exist":
```bash
createuser -s postgres
```

### If PostgreSQL isn't starting:
```bash
# For Homebrew installation
brew services restart postgresql@15

# For PostgreSQL.app
# Just restart the app

# For official installer
sudo launchctl load /Library/LaunchDaemons/com.edb.launchd.postgresql-15.plist
```

### If you get permission errors:
```bash
# Fix PostgreSQL data directory permissions
sudo chown -R $(whoami) /usr/local/var/postgres
```

### Check what's running on port 5432:
```bash
lsof -i :5432
```

## Alternative: Use Docker (Advanced)

If you prefer to use Docker for PostgreSQL:

```bash
# Pull and run PostgreSQL in Docker
docker run --name itiyum-postgres \
  -e POSTGRES_PASSWORD=itiyum_secure_password_2024 \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  -d postgres:15

# Verify it's running
docker ps

# Connect to the database
docker exec -it itiyum-postgres psql -U postgres
```

Then you can run the setup script normally.

## Next Steps

Once PostgreSQL is properly installed and running:

1. **Run the setup script**: `./setup_database.sh`
2. **Verify the database**: The script will create all tables and sample data
3. **Update your application**: Configure your Angular app to connect to PostgreSQL
4. **Start developing**: Use the comprehensive database schema for your Itiyum platform

## Connection Details

After successful setup, your database connection details will be:

- **Host**: localhost
- **Port**: 5432
- **Database**: itiyum_platform
- **Username**: itiyum_user
- **Password**: itiyum_secure_password_2024

**Connection String**:
```
postgresql://itiyum_user:itiyum_secure_password_2024@localhost:5432/itiyum_platform
```

## Support

If you encounter any issues:

1. Check the PostgreSQL logs
2. Ensure PostgreSQL is running on port 5432
3. Verify your user has the necessary permissions
4. Try connecting with pgAdmin 4 to test the connection

The improved setup script will automatically detect your PostgreSQL installation and guide you through any remaining setup steps.
