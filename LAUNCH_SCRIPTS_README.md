# Itiyum Platform Launch Scripts

## 🚀 Quick Start

### Launch Everything
```bash
./launch_entire_product.sh
```

This single command will:
1. ✅ Check and start PostgreSQL
2. ✅ Verify database exists
3. ✅ Switch to correct Node.js version (20.19.5)
4. ✅ Kill any existing processes on ports 3001 and 4200
5. ✅ Start backend server (port 3001)
6. ✅ Start frontend server (port 4200)
7. ✅ Wait for both to be fully ready
8. ✅ Display access URLs and credentials

### Stop Everything
```bash
./stop_entire_product.sh
```

This will:
1. 🛑 Stop backend server
2. 🛑 Stop frontend server
3. 🛑 Clean up all related processes

---

## 📋 What Gets Started

### Backend Server
- **URL**: http://localhost:3001
- **API**: http://localhost:3001/api
- **Log**: `backend.log`
- **Technology**: Node.js/Express

### Frontend Server
- **URL**: http://localhost:4200
- **Login**: http://localhost:4200/login
- **Log**: `frontend.log`
- **Technology**: Angular 20

### Database
- **Type**: PostgreSQL
- **Database**: `itiyum_platform`
- **User**: `michaelkateregga`

---

## 🔐 Default Admin Credentials

```
Email:    admin@itiyum.com
Password: Admin@123
```

---

## 📝 Viewing Logs

### Backend Logs
```bash
tail -f backend.log
```

### Frontend Logs
```bash
tail -f frontend.log
```

### Both Logs (in separate terminals)
```bash
# Terminal 1
tail -f backend.log

# Terminal 2
tail -f frontend.log
```

---

## 🛠️ Troubleshooting

### Script fails with "PostgreSQL not running"
```bash
# Start PostgreSQL manually
brew services start postgresql@14
# Or
brew services start postgresql

# Then run the launch script again
./launch_entire_product.sh
```

### Script fails with "Database not accessible"
```bash
# Check if database exists
psql -U michaelkateregga -d postgres -c "\l" | grep itiyum_platform

# If not, you need to restore the database
# (Contact admin for database backup)
```

### Script fails with "Node.js version error"
```bash
# Install nvm if not installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install Node.js 20.19.5
nvm install 20.19.5
nvm use 20.19.5

# Run the launch script again
./launch_entire_product.sh
```

### Port already in use
The script automatically kills processes on ports 3001 and 4200. If you still get errors:

```bash
# Manually kill processes
lsof -ti:3001 | xargs kill -9
lsof -ti:4200 | xargs kill -9

# Run the launch script again
./launch_entire_product.sh
```

### Frontend takes too long to build
First build can take 30-60 seconds. The script waits up to 2 minutes. If it times out:

```bash
# Check frontend logs
tail -50 frontend.log

# Common issues:
# - Node modules not installed (script auto-installs)
# - Wrong Node.js version (script checks this)
# - Build errors (check logs)
```

---

## 🔄 Manual Start (Alternative)

If you prefer to start services manually:

### Start Backend
```bash
cd backend
node server.js
```

### Start Frontend (in another terminal)
```bash
npm start
```

---

## 📊 Process Management

### Check Running Processes
```bash
# Check backend
lsof -i :3001

# Check frontend
lsof -i :4200

# Check saved PIDs
cat .itiyum_pids
```

### Kill Individual Services
```bash
# Kill backend
kill $(lsof -ti:3001)

# Kill frontend
kill $(lsof -ti:4200)

# Or use saved PIDs
source .itiyum_pids
kill $BACKEND_PID
kill $FRONTEND_PID
```

---

## 🎯 Features

### Launch Script Features
- ✅ Automatic dependency installation
- ✅ Node.js version checking and switching
- ✅ PostgreSQL health check
- ✅ Database accessibility verification
- ✅ Port conflict resolution
- ✅ Service health monitoring
- ✅ Colored output for easy reading
- ✅ Detailed error messages
- ✅ PID tracking for easy stopping
- ✅ Log file creation

### Stop Script Features
- ✅ Graceful shutdown
- ✅ Port-based process killing
- ✅ PID-based process killing
- ✅ Cleanup of temporary files
- ✅ Verification of shutdown

---

## 📁 Generated Files

### `.itiyum_pids`
Contains process IDs for easy stopping:
```bash
BACKEND_PID=4547
FRONTEND_PID=4575
```

### `backend.log`
Backend server output and errors

### `frontend.log`
Frontend build output and errors

---

## 🚨 Important Notes

1. **PostgreSQL must be installed** - The script checks but doesn't install PostgreSQL
2. **Database must exist** - The script verifies but doesn't create the database
3. **First run may be slow** - Frontend build can take 30-60 seconds
4. **Logs are appended** - Log files grow over time, clean them periodically
5. **PIDs are saved** - `.itiyum_pids` is created for easy stopping

---

## 🔧 Customization

### Change Ports
Edit the scripts to use different ports:
- Backend: Change `3001` to your desired port
- Frontend: Change `4200` to your desired port

### Change Node Version
Edit `launch_entire_product.sh` line with `nvm use 20.19.5` to your version

### Change Database User
Edit `backend/.env` file:
```env
DB_USER=your_username
DB_PASSWORD=your_password
```

---

## 📞 Support

If you encounter issues:
1. Check the logs: `backend.log` and `frontend.log`
2. Verify PostgreSQL is running: `pg_isready`
3. Check Node.js version: `node --version` (should be 20.19+)
4. Verify ports are free: `lsof -i :3001` and `lsof -i :4200`

---

## ✅ Success Indicators

When everything is working, you should see:
- ✅ Green success messages in terminal
- ✅ Backend responds at http://localhost:3001/api/auth/status
- ✅ Frontend loads at http://localhost:4200
- ✅ Login page accessible at http://localhost:4200/login
- ✅ Can login with admin@itiyum.com / Admin@123

---

## 🎉 Quick Reference

```bash
# Start everything
./launch_entire_product.sh

# Stop everything
./stop_entire_product.sh

# View backend logs
tail -f backend.log

# View frontend logs
tail -f frontend.log

# Check status
curl http://localhost:3001/api/auth/status
curl http://localhost:4200

# Login
# Go to: http://localhost:4200/login
# Email: admin@itiyum.com
# Password: Admin@123
```

