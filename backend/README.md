# Itiyum Backend API

Backend API for the Itiyum platform built with Node.js, Express, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Run the setup script**
   ```bash
   node scripts/setup.js
   ```

3. **Update environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3001/api`

## 📊 Database Setup

### Manual Setup (if setup script fails)

1. **Create PostgreSQL database**
   ```sql
   CREATE DATABASE itiyum_db;
   ```

2. **Run migrations**
   ```bash
   npm run migrate
   ```

3. **Seed with sample data**
   ```bash
   npm run seed
   ```

4. **Reset database (if needed)**
   ```bash
   npm run reset-db
   ```

## 🛠️ Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run migrate` - Run database migrations
- `npm run seed` - Seed database with sample data
- `npm run reset-db` - Reset and reseed database

## 📡 API Endpoints

### Community
- `GET /api/community/posts` - Get community posts
- `POST /api/community/posts` - Create new post
- `POST /api/community/posts/:id/like` - Toggle post like
- `GET /api/community/trending` - Get trending topics
- `GET /api/community/featured-chefs` - Get featured chefs
- `POST /api/community/chefs/:id/follow` - Follow/unfollow chef

### Health Check
- `GET /api/health` - API health status

## 🗄️ Database Schema

The database includes tables for:
- **users** - User accounts (regular users and chefs)
- **businesses** - Business profiles and information
- **menus** - Menu items and categories
- **menu_access** - Menu sharing permissions
- **legacy_access** - Account delegation permissions
- **community_posts** - Community posts and content
- **post_likes** - Post like relationships
- **post_comments** - Post comments
- **chef_follows** - Chef following relationships
- **business_insights** - Business analytics data
- **user_insights** - User analytics data
- **digital_cards** - Digital business cards
- **notifications** - User notifications

## 🔒 Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=itiyum_db
DB_USER=postgres
DB_PASSWORD=password

# Server
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:4200

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

## 📝 Sample Data

The seed script creates realistic sample data including:
- 5 users (3 chefs, 2 food lovers)
- 5 businesses (restaurants, cafes, pubs)
- 15 menu items across different categories
- Community posts and interactions
- Chef following relationships

## 🔧 Development

### Adding New Routes
1. Create route file in `/routes/`
2. Add route to `server.js`
3. Update this README

### Database Changes
1. Update `scripts/schema.sql`
2. Run `npm run reset-db` to apply changes
3. Update seed data if needed

## 🚨 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -l`

### Port Already in Use
- Change PORT in `.env`
- Kill existing process: `lsof -ti:3001 | xargs kill`

### Migration Errors
- Check PostgreSQL permissions
- Ensure database exists
- Run `npm run reset-db` to start fresh

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs for error details
3. Ensure all prerequisites are installed
