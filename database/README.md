# Itiyum Platform Database Schema

A comprehensive PostgreSQL database schema for the Itiyum food discovery and restaurant management platform.

## Overview

This database schema supports a multi-tenant food platform with the following key features:

- **5 User Types**: Normal Users, Food Enthusiasts, Business Owners, Specialists, and Eatier Admins
- **Restaurant Management**: Complete business profiles, menus, locations, and staff management
- **Review System**: Comprehensive review and rating system with social features
- **Booking System**: Table reservations and specialist service bookings
- **FAQ & Support**: Dynamic FAQ system with voting and feedback
- **Analytics**: Comprehensive analytics and reporting capabilities
- **Notifications**: Multi-channel notification system

## Database Structure

### Core Modules

1. **User Management** (`02_user_management.sql`)
   - User accounts with role-based access
   - Extended profiles for each user type
   - Authentication and session management
   - Social following system

2. **Business Management** (`03_business_management.sql`)
   - Restaurant/business profiles
   - Multiple locations per business
   - Staff management and permissions
   - Subscription and billing

3. **Menu Management** (`04_menu_management.sql`)
   - Hierarchical menu structure
   - Item variants and customizations
   - Availability scheduling
   - Pricing and promotions

4. **Reviews & Social** (`05_reviews_and_social.sql`)
   - Detailed review system with multiple ratings
   - Photo attachments and voting
   - User collections and badges
   - Social feed and interactions

5. **Bookings & Services** (`06_bookings_and_services.sql`)
   - Restaurant table bookings
   - Specialist service bookings
   - Availability management
   - Waitlist system

6. **FAQ & Support** (`07_faq_and_support.sql`)
   - Categorized FAQ system
   - Voting and feedback mechanisms
   - Support ticket system
   - Knowledge base articles

7. **Notifications & Analytics** (`08_notifications_and_analytics.sql`)
   - Multi-channel notifications
   - Comprehensive analytics tracking
   - A/B testing framework
   - Error logging

## Quick Start

### Prerequisites

- PostgreSQL 15 or higher
- Superuser access to create databases and users

### Installation

1. **Clone the repository and navigate to the database directory:**
   ```bash
   cd database/
   ```

2. **Run the setup script:**
   ```bash
   ./setup_database.sh
   ```

3. **Follow the prompts to:**
   - Create the database and user
   - Set up all tables and relationships
   - Optionally insert sample data

### Manual Setup

If you prefer manual setup:

```bash
# Create database
createdb itiyum_platform

# Execute schema files in order
psql -d itiyum_platform -f 01_setup_and_extensions.sql
psql -d itiyum_platform -f 02_user_management.sql
psql -d itiyum_platform -f 03_business_management.sql
psql -d itiyum_platform -f 04_menu_management.sql
psql -d itiyum_platform -f 05_reviews_and_social.sql
psql -d itiyum_platform -f 06_bookings_and_services.sql
psql -d itiyum_platform -f 07_faq_and_support.sql
psql -d itiyum_platform -f 08_notifications_and_analytics.sql
psql -d itiyum_platform -f 09_indexes_and_constraints.sql
psql -d itiyum_platform -f 10_sample_data.sql
```

## Configuration

### Environment Variables

```bash
DATABASE_URL=postgresql://eatier_user:eatier_secure_password_2024@localhost:5432/eatier_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=eatier_platform
DB_USER=eatier_user
DB_PASSWORD=eatier_secure_password_2024
```

### Connection Pool Settings

Recommended connection pool settings for production:

```javascript
// Node.js example
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Key Features

### User Role System

The platform supports 5 distinct user roles:

- **`normal_user`**: Basic food discovery and booking
- **`food_enthusiast`**: Advanced features, reviews, social following
- **`business_owner`**: Restaurant management and analytics
- **`specialist`**: Chef/catering services and portfolio management
- **`eatier_admin`**: Platform administration and oversight

### Data Types

Custom PostgreSQL types for consistency:

```sql
-- User and business status
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE business_status AS ENUM ('active', 'inactive', 'pending_verification', 'suspended', 'closed');

-- Cuisine and dietary information
CREATE TYPE cuisine_type AS ENUM ('american', 'italian', 'chinese', 'japanese', ...);
CREATE TYPE dietary_restriction AS ENUM ('vegetarian', 'vegan', 'gluten_free', ...);

-- Booking and payment status
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed', 'no_show');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
```

### Performance Optimizations

- **Indexes**: Comprehensive indexing strategy for common queries
- **Partial Indexes**: Optimized indexes for filtered queries
- **Full-Text Search**: PostgreSQL full-text search for content
- **JSONB**: Flexible data storage with indexing support
- **Constraints**: Data integrity and business rule enforcement

### Security Features

- **Row-Level Security**: User data isolation
- **Audit Trails**: Automatic timestamp tracking
- **Password Hashing**: Secure password storage
- **Session Management**: Secure authentication tokens

## Sample Data

The schema includes comprehensive sample data:

- **5 Demo Users** (one for each role)
- **Sample Restaurant** with menu items and reviews
- **FAQ Categories and Items** with realistic content
- **Notification Templates** for common scenarios

### Demo Accounts

| Email | Password | Role | Description |
|-------|----------|------|-------------|
| admin@itiyum.com | password123 | itiyum_admin | Platform administrator |
| business@example.com | password123 | business_owner | Restaurant owner |
| user@example.com | password123 | food_enthusiast | Food enthusiast |
| normaluser@example.com | password123 | normal_user | Regular user |
| chef@example.com | password123 | specialist | Professional chef |

## API Integration

### Common Queries

**Get user with profile:**
```sql
SELECT u.*, up.bio, up.location, up.social_links
FROM users u
LEFT JOIN user_profiles up ON u.id = up.user_id
WHERE u.email = $1 AND u.status = 'active';
```

**Search businesses:**
```sql
SELECT b.*, bl.address, bl.city, bl.state
FROM businesses b
JOIN business_locations bl ON b.id = bl.business_id
WHERE b.status = 'active'
  AND bl.city ILIKE $1
  AND b.cuisine_types && $2
ORDER BY b.average_rating DESC, b.total_reviews DESC;
```

**Get FAQ by category:**
```sql
SELECT f.*, fc.name as category_name
FROM faqs f
JOIN faq_categories fc ON f.category_id = fc.id
WHERE fc.id = $1 AND f.is_active = true
ORDER BY f.helpful_votes DESC;
```

## Maintenance

### Regular Tasks

1. **Update Statistics:**
   ```sql
   ANALYZE;
   ```

2. **Vacuum Tables:**
   ```sql
   VACUUM ANALYZE;
   ```

3. **Monitor Index Usage:**
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

### Backup Strategy

```bash
# Full backup
pg_dump eatier_platform > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only
pg_dump --schema-only eatier_platform > schema_backup.sql

# Data only
pg_dump --data-only eatier_platform > data_backup.sql
```

## Migration Strategy

For production deployments:

1. **Version Control**: Track schema changes with migration files
2. **Rollback Plans**: Always have rollback scripts ready
3. **Testing**: Test migrations on staging environment first
4. **Monitoring**: Monitor performance after schema changes

## Support

For questions or issues:

1. Check the FAQ system (implemented in the database!)
2. Review the sample data for usage examples
3. Examine the constraints and indexes for business rules
4. Use the analytics tables to understand data patterns

## License

This database schema is part of the Itiyum platform and follows the project's licensing terms.
