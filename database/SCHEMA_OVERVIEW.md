# Itiyum Platform Database Schema Overview

## Database Statistics

- **Total Tables**: 50+ tables
- **Total Indexes**: 100+ optimized indexes
- **Custom Types**: 15+ PostgreSQL enums
- **Relationships**: Comprehensive foreign key constraints
- **Sample Data**: 22 FAQs, 5 demo users, sample restaurant data

## Table Categories

### 🔐 User Management (8 tables)
- `users` - Core user accounts
- `user_profiles` - Extended profile information
- `user_preferences` - Settings and preferences
- `food_enthusiast_profiles` - Food enthusiast specific data
- `specialist_profiles` - Chef/specialist profiles
- `admin_profiles` - Admin specific data
- `user_sessions` - Authentication sessions
- `user_verifications` - Email/phone verification
- `user_follows` - Social following relationships
- `user_activity_log` - User activity tracking

### 🏪 Business Management (9 tables)
- `businesses` - Restaurant/business profiles
- `business_locations` - Multiple locations per business
- `business_hours` - Operating schedules
- `business_media` - Photos and videos
- `business_staff` - Staff management
- `business_subscriptions` - Billing and plans
- `business_analytics` - Performance metrics
- `business_settings` - Configuration
- `business_review_summary` - Aggregated review data

### 🍽️ Menu Management (10 tables)
- `menu_categories` - Menu organization
- `menu_items` - Individual dishes
- `menu_item_photos` - Dish photography
- `menu_item_variants` - Sizes and customizations
- `menu_availability` - Scheduling and availability
- `menu_item_reviews` - Item-specific reviews
- `menu_item_analytics` - Performance tracking
- `menu_specials` - Daily specials and promotions
- `menu_templates` - Template system for chains
- `menu_template_items` - Template items
- `user_favorite_items` - User favorites

### ⭐ Reviews & Social (12 tables)
- `reviews` - Business reviews with detailed ratings
- `review_photos` - Review photo attachments
- `review_votes` - Helpfulness voting
- `review_tags` - Review categorization
- `user_badges` - Achievement system
- `user_collections` - User-created lists
- `collection_items` - Items in collections
- `user_checkins` - Location check-ins
- `social_posts` - Social feed posts
- `post_interactions` - Likes, comments, shares
- `user_recommendations` - AI-powered suggestions
- `trending_items` - Trending businesses and dishes

### 📅 Bookings & Services (10 tables)
- `bookings` - Restaurant table reservations
- `booking_modifications` - Booking change history
- `specialist_services` - Services offered by specialists
- `specialist_availability` - Specialist schedules
- `specialist_bookings` - Service bookings
- `booking_notifications` - Booking-related notifications
- `restaurant_tables` - Table management
- `table_reservations` - Table assignments
- `booking_waitlist` - Waitlist management
- `booking_analytics` - Booking performance metrics

### ❓ FAQ & Support (12 tables)
- `faq_categories` - FAQ organization
- `faqs` - Frequently asked questions
- `faq_votes` - Helpfulness voting
- `faq_feedback` - User feedback on FAQs
- `support_tickets` - Customer support system
- `support_ticket_messages` - Ticket conversations
- `knowledge_base_articles` - Help articles
- `kb_article_votes` - Article helpfulness
- `system_announcements` - Platform announcements
- `user_feedback` - Feature requests and feedback
- `feedback_votes` - Voting on feature requests
- `faq_search_analytics` - Search behavior tracking

### 📊 Notifications & Analytics (12 tables)
- `notification_templates` - Message templates
- `notifications` - User notifications
- `email_delivery_log` - Email tracking
- `push_notification_tokens` - Push notification setup
- `platform_analytics` - Platform-wide metrics
- `user_engagement_analytics` - User behavior tracking
- `search_analytics` - Search behavior analysis
- `page_view_analytics` - Page view tracking
- `business_performance_metrics` - Business analytics
- `revenue_analytics` - Financial tracking
- `ab_test_experiments` - A/B testing framework
- `ab_test_assignments` - Test participant assignments
- `error_logs` - Error and exception tracking

## Key Relationships

```
users (1) ←→ (1) user_profiles
users (1) ←→ (1) user_preferences
users (1) ←→ (0..1) food_enthusiast_profiles
users (1) ←→ (0..1) specialist_profiles
users (1) ←→ (0..1) admin_profiles

users (1) ←→ (0..*) businesses (as owner)
businesses (1) ←→ (1..*) business_locations
businesses (1) ←→ (0..*) menu_categories
menu_categories (1) ←→ (0..*) menu_items

users (1) ←→ (0..*) reviews
businesses (1) ←→ (0..*) reviews
reviews (1) ←→ (0..*) review_photos

users (1) ←→ (0..*) bookings
businesses (1) ←→ (0..*) bookings

faq_categories (1) ←→ (0..*) faqs
faqs (1) ←→ (0..*) faq_votes
```

## Performance Features

### Indexing Strategy
- **Primary Keys**: UUID with btree indexes
- **Foreign Keys**: Indexed for join performance
- **Search Fields**: Full-text search indexes
- **Filtering**: Partial indexes for common filters
- **Sorting**: Composite indexes for common sorts

### Query Optimization
- **Materialized Views**: For complex aggregations
- **Denormalized Data**: Strategic denormalization for performance
- **Partitioning**: Ready for table partitioning on large tables
- **Connection Pooling**: Optimized for connection pool usage

## Security Features

### Data Protection
- **Password Hashing**: bcrypt with salt
- **Session Management**: Secure token-based authentication
- **Data Validation**: Comprehensive constraints and checks
- **Audit Trails**: Automatic timestamp tracking

### Access Control
- **Role-Based Access**: User role system
- **Row-Level Security**: User data isolation
- **API Security**: Prepared for API key management
- **Privacy Controls**: User privacy preference system

## Scalability Considerations

### Horizontal Scaling
- **Read Replicas**: Schema supports read replica setup
- **Sharding**: UUID primary keys support sharding
- **Caching**: JSONB fields for flexible caching
- **CDN Integration**: URL fields for media CDN integration

### Vertical Scaling
- **Efficient Queries**: Optimized for minimal resource usage
- **Index Coverage**: Covering indexes where beneficial
- **Data Types**: Appropriate data types for storage efficiency
- **Compression**: JSONB compression for flexible data

## Development Workflow

### Local Development
1. Run `./setup_database.sh` for complete setup
2. Use sample data for immediate development
3. Test with realistic data volumes
4. Monitor query performance

### Testing
- **Unit Tests**: Test individual table constraints
- **Integration Tests**: Test cross-table relationships
- **Performance Tests**: Test with realistic data volumes
- **Migration Tests**: Test schema changes

### Production Deployment
- **Migration Scripts**: Version-controlled schema changes
- **Backup Strategy**: Automated backup procedures
- **Monitoring**: Query performance monitoring
- **Maintenance**: Regular maintenance procedures

## Integration Points

### Application Layer
- **ORM Support**: Compatible with popular ORMs
- **API Design**: RESTful API-friendly structure
- **GraphQL**: Suitable for GraphQL implementations
- **Real-time**: WebSocket-friendly for real-time features

### External Services
- **Payment Processing**: Payment status tracking
- **Email Services**: Email delivery logging
- **Push Notifications**: Token management
- **Analytics**: Event tracking and metrics
- **Search Services**: Full-text search integration
- **File Storage**: URL-based media management

## Monitoring & Maintenance

### Health Checks
- **Connection Monitoring**: Database connectivity
- **Query Performance**: Slow query identification
- **Index Usage**: Index effectiveness monitoring
- **Storage Usage**: Disk space monitoring

### Regular Maintenance
- **Statistics Updates**: Keep query planner informed
- **Vacuum Operations**: Maintain table health
- **Index Maintenance**: Rebuild fragmented indexes
- **Backup Verification**: Ensure backup integrity

This comprehensive database schema provides a solid foundation for the Itiyum platform, supporting all current features while being designed for future scalability and extensibility.
