# 🍽️ Itiyum Platform - Startup Guide

Welcome to the Itiyum Platform! This guide will help you get the entire application running quickly and easily.

## 🚀 Quick Start Options

### Option 1: Complete Setup (First Time)
Use this for the first time or when you need to set up everything from scratch:

```bash
./start-itiyum.sh
```

**What it does:**
- ✅ Checks all prerequisites (Node.js, npm, Angular CLI, PostgreSQL)
- ✅ Sets up PostgreSQL database with sample data
- ✅ Creates backend environment configuration
- ✅ Installs all dependencies (frontend & backend)
- ✅ Starts both backend API and frontend app
- ✅ Opens your browser automatically

### Option 2: Quick Start (Already Set Up)
Use this when everything is already configured and you just want to start the services:

```bash
./quick-start.sh
```

**What it does:**
- 🚀 Starts backend API server
- 🌐 Starts frontend development server
- 🌍 Opens browser automatically

## 📋 Prerequisites

Before running the scripts, make sure you have:

1. **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
2. **npm** (comes with Node.js)
3. **PostgreSQL** (v13 or higher) - [Installation options](#postgresql-installation)

### PostgreSQL Installation

Choose one of these options:

#### Option A: Homebrew (macOS)
```bash
brew install postgresql
brew services start postgresql
```

#### Option B: PostgreSQL.app (macOS)
1. Download from [https://postgresapp.com/](https://postgresapp.com/)
2. Install and start the app

#### Option C: Official Installer
1. Download from [https://www.postgresql.org/download/](https://www.postgresql.org/download/)
2. Follow installation instructions for your OS

## 🌐 Access Your Application

Once started, you can access:

- **Frontend Application**: [http://localhost:4200](http://localhost:4200)
- **Backend API**: [http://localhost:3000](http://localhost:3000)
- **Database**: `itiyum_platform` on `localhost:5432`

## 🔐 Default Database Credentials

The setup creates these database credentials:

- **Database**: `itiyum_platform`
- **Username**: `itiyum_user`
- **Password**: `itiyum_secure_password_2024`
- **Host**: `localhost`
- **Port**: `5432`

## 📁 Project Structure

```
itiyum/
├── src/                    # Angular frontend source
├── backend/               # Node.js/Express API
├── database/             # PostgreSQL setup scripts
├── start-itiyum.sh      # Complete setup script
├── quick-start.sh       # Quick start script
└── STARTUP_GUIDE.md     # This guide
```

## 🛑 Stopping the Application

To stop all services:
1. Press `Ctrl+C` in the terminal where the script is running
2. The script will automatically clean up all processes

## 📝 Logs

When running, logs are saved to:
- `frontend.log` - Angular development server logs
- `backend.log` - Node.js API server logs

## 🔧 Troubleshooting

### PostgreSQL Issues
If you get database connection errors:

1. **Check if PostgreSQL is running:**
   ```bash
   pg_isready -h localhost -p 5432
   ```

2. **Start PostgreSQL:**
   ```bash
   # Homebrew
   brew services start postgresql
   
   # PostgreSQL.app
   # Just start the app
   
   # System service (Linux)
   sudo systemctl start postgresql
   ```

### Port Conflicts
If ports 3000 or 4200 are in use:

1. **Find what's using the port:**
   ```bash
   lsof -i :3000  # or :4200
   ```

2. **Kill the process:**
   ```bash
   kill -9 <PID>
   ```

3. **Or the scripts will do this automatically**

### Permission Issues
If you get permission errors:

```bash
chmod +x start-itiyum.sh
chmod +x quick-start.sh
```

### Missing Dependencies
If you get "command not found" errors:

1. **Install Angular CLI globally:**
   ```bash
   npm install -g @angular/cli
   ```

2. **Update npm:**
   ```bash
   npm install -g npm@latest
   ```

## 🎯 Development Features

The platform includes:

- **🔐 Authentication System** - Login/signup functionality
- **👥 User Management** - Different account types (Business, Food Enthusiast, Chef)
- **🍽️ Menu Management** - Create and manage restaurant menus
- **⭐ Reviews & Ratings** - Customer feedback system
- **📊 Analytics Dashboard** - Business insights
- **📱 Responsive Design** - Works on all devices

## 🎨 Design System

The application now uses **Travelstart's design system** with:
- **🔵 Professional blue color scheme** (`#1db2f5`)
- **⚫ Clean navy accents** (`#062231`)
- **🔤 Roboto typography** for excellent readability
- **💼 Professional layouts** with clean white cards

## 🆘 Need Help?

If you encounter any issues:

1. Check the logs (`frontend.log` and `backend.log`)
2. Ensure all prerequisites are installed
3. Try the complete setup script: `./start-itiyum.sh`
4. Check that PostgreSQL is running and accessible

## 🎉 Ready to Go!

Your Itiyum platform is now ready for development and testing. The application includes sample data so you can immediately test all features including signup, login, menu management, and more!

Happy coding! 🚀
