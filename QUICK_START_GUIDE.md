# 🚀 Itiyum Platform - Quick Start Guide

## One-Command Launch

Start the entire platform (PostgreSQL + Backend API + Frontend) with a single command:

```bash
./launch_entire_product.sh
```

This script will:
1. ✅ Check and start PostgreSQL if needed
2. ✅ Verify database connectivity
3. ✅ **Auto-initialize database if empty** (creates tables + admin user)
4. ✅ Load nvm and ensure correct Node.js version (v22.12.0)
5. ✅ Auto-install Node.js v22.12.0 if not present
6. ✅ Kill any processes on ports 3001 and 4200
7. ✅ Install dependencies if needed
8. ✅ Start Backend API server (port 3001)
9. ✅ Start Frontend Angular app (port 4200)

### First Time Launch

On your **first launch**, the script will automatically:
- Create all database tables (users, businesses, bookings, etc.)
- Set up multi-tenancy and RBAC (Role-Based Access Control)
- Create the admin user with credentials below
- Seed initial data

**This only happens once!** After that, your data persists between restarts.

## Stop All Services

```bash
./stop_entire_product.sh
```

## Access URLs

Once launched, access the platform at:

- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:3001/api
- **Login Page**: http://localhost:4200/login

## Default Admin Credentials

```
Email:    admin@itiyum.com
Password: Admin@123
```

## View Logs

```bash
# Backend logs
tail -f backend.log

# Frontend logs
tail -f frontend.log
```

## Troubleshooting

### Node.js Version Issues

The script automatically handles Node.js version management. If you see version errors:

1. The script will auto-install Node.js v22.12.0 via nvm
2. If nvm is not installed, the script will provide installation instructions

### Port Already in Use

The script automatically kills processes on ports 3001 and 4200 before starting.

### Database Connection Issues

Ensure PostgreSQL is running and the database exists:

```bash
# Check PostgreSQL status
pg_isready

# Start PostgreSQL if needed
brew services start postgresql@14
```

## Manual Service Management

If you need to start services individually:

### Backend Only
```bash
cd backend
node server.js
```

### Frontend Only
```bash
npm start
```

## Architecture

- **Database**: PostgreSQL (itiyum_platform)
- **Backend**: Node.js/Express API (port 3001)
- **Frontend**: Angular 18 (port 4200)
- **Node.js**: v22.12.0 (managed by nvm)

## First Time Setup

The launch script handles everything automatically, but if you need to set up manually:

1. Install nvm (if not already installed)
2. Install Node.js v22.12.0: `nvm install 22.12.0`
3. Create PostgreSQL database: `createdb itiyum_platform`
4. Run database migrations (if any)
5. Install dependencies: `npm install` (root and backend)

## Notes

- First build may take 30-60 seconds
- Logs are saved to `backend.log` and `frontend.log`
- Process IDs are saved to `.itiyum_pids` for easy stopping
- The script uses nvm to manage Node.js versions automatically

