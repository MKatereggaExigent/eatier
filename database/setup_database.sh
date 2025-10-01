#!/bin/bash

# ===================================
# ITIYUM PLATFORM DATABASE SETUP
# PostgreSQL 15+ Required
# ===================================

set -e

# Configuration
DB_NAME="itiyum_platform"
DB_USER="itiyum_user"
DB_PASSWORD="itiyum_secure_password_2024"
DB_HOST="localhost"
DB_PORT="5432"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================="
echo -e "ITIYUM PLATFORM DATABASE SETUP"
echo -e "=====================================${NC}"

# Function to find PostgreSQL installation
find_postgresql() {
    # Common PostgreSQL paths
    POSTGRES_PATHS=(
        "/usr/local/bin"
        "/usr/local/pgsql/bin"
        "/opt/homebrew/bin"
        "/Library/PostgreSQL/*/bin"
        "/Applications/Postgres.app/Contents/Versions/*/bin"
        "/usr/bin"
    )

    for path in "${POSTGRES_PATHS[@]}"; do
        if [ -f "$path/psql" ]; then
            export PATH="$path:$PATH"
            echo -e "${GREEN}✓ Found PostgreSQL at: $path${NC}"
            return 0
        fi
    done

    return 1
}

# Try to find PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found in PATH, searching...${NC}"
    if ! find_postgresql; then
        echo -e "${RED}Error: PostgreSQL not found!${NC}"
        echo -e "${YELLOW}Please install PostgreSQL first:${NC}"
        echo -e "${BLUE}Option 1 - Homebrew:${NC} brew install postgresql"
        echo -e "${BLUE}Option 2 - PostgreSQL.app:${NC} Download from https://postgresapp.com/"
        echo -e "${BLUE}Option 3 - Official installer:${NC} Download from https://www.postgresql.org/download/"
        exit 1
    fi
fi

# Check PostgreSQL version
PG_VERSION=$(psql --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
echo -e "${GREEN}✓ PostgreSQL version: $PG_VERSION${NC}"

# Function to find superuser
find_superuser() {
    # Try common superuser names
    SUPERUSERS=("postgres" "$USER" "$(whoami)")

    for user in "${SUPERUSERS[@]}"; do
        if psql -h $DB_HOST -p $DB_PORT -U "$user" -c '\q' 2>/dev/null; then
            echo "$user"
            return 0
        fi
    done

    return 1
}

# Find available superuser
SUPERUSER=$(find_superuser)
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: No PostgreSQL superuser found!${NC}"
    echo -e "${YELLOW}Please ensure PostgreSQL is running and you have superuser access.${NC}"
    echo -e "${BLUE}Try starting PostgreSQL:${NC}"
    echo -e "  - Homebrew: brew services start postgresql"
    echo -e "  - PostgreSQL.app: Start the app"
    echo -e "  - System service: sudo systemctl start postgresql"
    exit 1
fi

echo -e "${GREEN}✓ Using superuser: $SUPERUSER${NC}"

# Check if PostgreSQL is running
if ! pg_isready -h $DB_HOST -p $DB_PORT > /dev/null 2>&1; then
    echo -e "${RED}Error: PostgreSQL is not running on $DB_HOST:$DB_PORT${NC}"
    echo -e "${YELLOW}Please start PostgreSQL and try again.${NC}"
    echo -e "${BLUE}Try:${NC}"
    echo -e "  - Homebrew: brew services start postgresql"
    echo -e "  - PostgreSQL.app: Start the application"
    exit 1
fi

echo -e "${GREEN}✓ PostgreSQL is running${NC}"

# Check if database exists
if psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    echo -e "${YELLOW}Database '$DB_NAME' already exists.${NC}"
    read -p "Do you want to drop and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Dropping existing database...${NC}"
        dropdb -h $DB_HOST -p $DB_PORT -U $SUPERUSER $DB_NAME
    else
        echo -e "${YELLOW}Exiting without changes.${NC}"
        exit 0
    fi
fi

# Create database and user
echo -e "${BLUE}Creating database and user...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -c "CREATE DATABASE $DB_NAME;"
psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -c "ALTER USER $DB_USER CREATEDB;"

echo -e "${GREEN}✓ Database and user created${NC}"

# Function to execute SQL file
execute_sql_file() {
    local file=$1
    local description=$2

    if [ -f "$file" ]; then
        echo -e "${BLUE}Executing: $description${NC}"
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$file"
        echo -e "${GREEN}✓ $description completed${NC}"
    else
        echo -e "${RED}Error: File $file not found${NC}"
        exit 1
    fi
}

# Execute SQL files in order
echo -e "${BLUE}Setting up database schema...${NC}"

execute_sql_file "01_setup_and_extensions.sql" "Extensions and Types Setup"
execute_sql_file "02_user_management.sql" "User Management Tables"
execute_sql_file "03_business_management.sql" "Business Management Tables"
execute_sql_file "04_menu_management.sql" "Menu Management Tables"
execute_sql_file "05_reviews_and_social.sql" "Reviews and Social Tables"
execute_sql_file "06_bookings_and_services.sql" "Bookings and Services Tables"
execute_sql_file "07_faq_and_support.sql" "FAQ and Support Tables"
execute_sql_file "08_notifications_and_analytics.sql" "Notifications and Analytics Tables"
execute_sql_file "09_indexes_and_constraints.sql" "Indexes and Constraints"

# Ask if user wants to insert sample data
echo -e "${YELLOW}Do you want to insert sample data for development? (y/N):${NC}"
read -p "" -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    execute_sql_file "10_sample_data.sql" "Sample Data Insertion"
fi

# Grant additional permissions
echo -e "${BLUE}Setting up permissions...${NC}"
psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -d $DB_NAME -c "GRANT ALL ON ALL TABLES IN SCHEMA public TO $DB_USER;"
psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -d $DB_NAME -c "GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;"
psql -h $DB_HOST -p $DB_PORT -U $SUPERUSER -d $DB_NAME -c "GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO $DB_USER;"

echo -e "${GREEN}✓ Permissions configured${NC}"

# Display connection information
echo -e "${BLUE}====================================="
echo -e "DATABASE SETUP COMPLETE!"
echo -e "=====================================${NC}"
echo -e "${GREEN}Database Name: $DB_NAME${NC}"
echo -e "${GREEN}Database User: $DB_USER${NC}"
echo -e "${GREEN}Database Host: $DB_HOST${NC}"
echo -e "${GREEN}Database Port: $DB_PORT${NC}"
echo -e "${YELLOW}Password: $DB_PASSWORD${NC}"
echo ""
echo -e "${BLUE}Connection String:${NC}"
echo -e "${YELLOW}postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME${NC}"
echo ""
echo -e "${BLUE}Environment Variables for your application:${NC}"
echo -e "${YELLOW}DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME${NC}"
echo -e "${YELLOW}DB_HOST=$DB_HOST${NC}"
echo -e "${YELLOW}DB_PORT=$DB_PORT${NC}"
echo -e "${YELLOW}DB_NAME=$DB_NAME${NC}"
echo -e "${YELLOW}DB_USER=$DB_USER${NC}"
echo -e "${YELLOW}DB_PASSWORD=$DB_PASSWORD${NC}"
echo ""
echo -e "${GREEN}✓ Setup completed successfully!${NC}"

# Test connection
echo -e "${BLUE}Testing database connection...${NC}"
if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 'Connection successful!' as status;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection test passed${NC}"
else
    echo -e "${RED}✗ Database connection test failed${NC}"
    exit 1
fi

echo -e "${BLUE}====================================="
echo -e "READY TO USE!"
echo -e "=====================================${NC}"
