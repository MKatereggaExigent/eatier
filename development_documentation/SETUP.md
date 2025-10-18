# 🍽️ Itiyum Platform - Complete Setup Guide

This guide will help you set up the complete Itiyum platform with PostgreSQL database, backend API, and Angular frontend.

## 📋 Prerequisites

- **Node.js** (v16 or higher)
- **PostgreSQL** (v12 or higher)
- **Angular CLI** (v17 or higher)
- **npm** or **yarn**

## 🚀 Quick Start

### 1. Database Setup

First, ensure PostgreSQL is running and create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE itiyum_db;

# Exit PostgreSQL
\q
```

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# Update DB_USER, DB_PASSWORD, etc.

# Run database migrations
npm run migrate

# Seed with realistic dummy data
npm run seed

# Start the backend server
npm run dev
```

The backend API will be available at `http://localhost:3001/api`

### 3. Frontend Setup

```bash
# Navigate back to root directory
cd ..

# Install Angular dependencies
npm install

# Start the Angular development server
ng serve
```

The frontend will be available at `http://localhost:4200`

## 🗄️ Database Features

The PostgreSQL database includes:

### **Tables Created:**
- **users** - User accounts (chefs and food lovers)
- **businesses** - Restaurant and business profiles
- **menus** - Menu items with categories
- **menu_access** - Menu sharing permissions
- **legacy_access** - Account delegation
- **community_posts** - Social media posts
- **post_likes** - Post interactions
- **chef_follows** - Chef following relationships
- **business_insights** - Analytics data
- **user_insights** - User analytics
- **digital_cards** - Digital business cards
- **notifications** - User notifications

### **Realistic Dummy Data:**
- **5 Users**: 3 professional chefs, 2 food enthusiasts
- **5 Businesses**: Italian restaurant, Korean kitchen, Chinese palace, eco cafe, British pub
- **15 Menu Items**: Across all categories (breakfast, lunch, dinner, beverages, desserts)
- **Community Posts**: Realistic social media content
- **Chef Profiles**: Complete with specialties and experience

## 🎯 Key Features Working

### **✅ Community Tab**
- Social media feed with posts from chefs, businesses, and users
- Like, comment, and share functionality
- Trending topics and hashtags
- Featured chefs with follow/unfollow
- Create new posts with images and tags

### **✅ Business Dashboard**
- Complete business profile management
- Menu Management Toolkit with exact specifications:
  - 15-character descriptions (no emojis)
  - Access levels: "Edit and See Menu", "See but Not Edit", "Cannot Edit"
  - Menu sharing with email invitations
- Business insights with charts and analytics
- Digital business card creation
- Account management (freeze/delete)

### **✅ User Dashboard**
- User profile with "I'm a chef" option
- 160-character bio limit
- Professional information and certifications
- User insights and analytics
- Legacy account access delegation
- Digital card customization

### **✅ Navigation & Links**
All navigation links now work and redirect to functional pages:
- Community tab loads real social media content
- All dashboard sections are fully functional
- Profile management works with database persistence
- Menu management includes all specified features

## 🔧 API Endpoints Available

### **Community**
- `GET /api/community/posts` - Get community posts
- `POST /api/community/posts` - Create new post
- `POST /api/community/posts/:id/like` - Toggle like
- `GET /api/community/trending` - Trending topics
- `GET /api/community/featured-chefs` - Featured chefs

### **Users**
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `POST /api/users/:id/freeze` - Freeze account
- `DELETE /api/users/:id` - Delete account

### **Businesses**
- `GET /api/businesses` - Get all businesses
- `POST /api/businesses` - Create business
- `PUT /api/businesses/:id` - Update business
- `POST /api/businesses/:id/freeze` - Freeze business

### **Menus**
- `GET /api/menus/business/:id` - Get business menus
- `POST /api/menus` - Create menu item
- `PUT /api/menus/:id` - Update menu item
- `POST /api/menus/:id/access` - Grant menu access

### **Insights**
- `GET /api/insights/business/:id` - Business analytics
- `GET /api/insights/user/:id` - User analytics

## 🎨 UI Features Implemented

### **Exact Specifications Met:**
- **Bio character limit**: 160 characters with real-time counter
- **Menu descriptions**: 15 characters, no emojis, with validation
- **Freeze options**: "1 week", "Month", "6 months", "Indefinitely"
- **Menu access levels**: Exact wording as specified
- **Chef checkbox**: "👨‍🍳 I'm a chef" in user profiles
- **Facilities icons**: Parking, WiFi, wheelchair accessible, etc.

### **Interactive Elements:**
- All buttons and links are functional
- Form validation with real-time feedback
- Modal popups for menu creation and access management
- Success/error messages with proper UX
- Loading states and animations

## 🔄 Data Flow

1. **Frontend** (Angular) makes HTTP requests
2. **Backend API** (Express.js) processes requests
3. **PostgreSQL Database** stores and retrieves data
4. **Real-time updates** reflect in the UI immediately

## 🧪 Testing the System

### **Community Features:**
1. Visit `http://localhost:4200/community`
2. Browse posts from chefs and businesses
3. Like posts and follow chefs
4. Create new posts with images and tags
5. Check trending topics

### **Business Management:**
1. Navigate to business dashboard
2. Create menu items with 15-character descriptions
3. Grant menu access to email addresses
4. View business insights and analytics

### **User Profiles:**
1. Update user profiles with chef option
2. Add specialty dishes and certifications
3. Set up legacy account access
4. Customize digital cards

## 🚨 Troubleshooting

### **Database Connection Issues:**
```bash
# Check PostgreSQL status
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql      # Linux

# Reset database if needed
cd backend
npm run reset-db
```

### **Port Conflicts:**
- Backend runs on port 3001
- Frontend runs on port 4200
- Change ports in `.env` and `environment.ts` if needed

### **API Connection Issues:**
- Ensure backend is running before starting frontend
- Check browser console for CORS errors
- Verify API URL in `src/environments/environment.ts`

## 🎉 Success!

If everything is set up correctly, you should see:
- ✅ Community tab with real posts and interactions
- ✅ All navigation links working
- ✅ Database-backed user and business profiles
- ✅ Functional menu management with exact specifications
- ✅ Real-time analytics and insights
- ✅ Complete account management features

The Itiyum platform is now fully functional with persistent PostgreSQL data and realistic dummy content that makes all features interactive and testable!
