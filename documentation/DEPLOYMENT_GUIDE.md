# Eatier/Itiyum Production Deployment Guide

This guide explains how to deploy the Eatier platform to production using CapRover for the frontend and Docker Compose for the backend.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR SERVER                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────────┐    ┌──────────────────┐              │
│   │   CapRover       │    │   Docker         │              │
│   │   (Frontend)     │    │   (Backend)      │              │
│   │                  │    │                  │              │
│   │ - Angular App    │───▶│ - Node.js API    │              │
│   │ - Nginx Proxy    │    │ - Port 3001      │              │
│   │ - SSL/HTTPS      │    │                  │              │
│   └──────────────────┘    └────────┬─────────┘              │
│                                    │                         │
│                           ┌────────▼─────────┐              │
│                           │   PostgreSQL     │              │
│                           │   (Database)     │              │
│                           │   Port 5432      │              │
│                           └──────────────────┘              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Server Requirements:**
   - Ubuntu 20.04+ or similar Linux
   - Docker & Docker Compose installed
   - CapRover installed and configured
   - Domain pointing to server

2. **Local Requirements:**
   - Node.js 20+
   - npm
   - CapRover CLI: `npm install -g caprover`

## Step 1: Configure CapRover CLI

```bash
# Login to your CapRover server
caprover login

# When prompted:
# - CapRover URL: https://captain.yourdomain.com
# - Password: Your CapRover admin password
# - Name: aidoc-server (or your preferred name)
```

## Step 2: Create CapRover App

1. Go to your CapRover dashboard
2. Create a new app named `itiyum`
3. Enable HTTPS (Let's Encrypt)
4. Note: Don't deploy yet - we'll use the script

## Step 3: Deploy Backend First

```bash
# Update configuration in deploy_backend.sh
# - SERVER_HOST: Your server IP
# - SERVER_USER: SSH user (usually root)
# - SERVER_PATH: Where to deploy (default: /opt/itiyum)

# Deploy backend
./deploy_backend.sh
```

After deployment, SSH to your server and update the `.env` file:

```bash
ssh root@your-server-ip
cd /opt/itiyum
nano .env
# Update DB_PASSWORD, JWT_SECRET, CORS_ORIGIN, etc.
docker-compose restart
```

## Step 4: Deploy Frontend

```bash
# Update configuration in deploy_to_caprover.sh
# - CAPROVER_NAME: Your CapRover server name
# - CAPROVER_APP: App name (itiyum)
# - BACKEND_HOST: Your server IP
# - BACKEND_PORT: Backend port (3001)

# Deploy frontend
./deploy_to_caprover.sh
```

## Step 5: Verify Deployment

1. Visit: https://itiyum.yourdomain.com
2. Test login functionality
3. Check API connectivity

## Configuration Files

| File | Purpose |
|------|---------|
| `deploy_to_caprover.sh` | Deploys Angular frontend to CapRover |
| `deploy_backend.sh` | Deploys Node.js backend via SSH |
| `docker-compose.prod.yml` | Production Docker Compose config |
| `.env.production` | Environment variables template |

## Updating the Application

### Update Frontend Only
```bash
./deploy_to_caprover.sh
```

### Update Backend Only
```bash
./deploy_backend.sh
```

### Update Both
```bash
./deploy_backend.sh
./deploy_to_caprover.sh
```

## Troubleshooting

### Check Backend Logs
```bash
ssh root@your-server-ip
cd /opt/itiyum
docker-compose logs -f backend
```

### Check Database
```bash
ssh root@your-server-ip
cd /opt/itiyum
docker-compose exec postgres psql -U itiyum -d itiyum
```

### Restart Services
```bash
ssh root@your-server-ip
cd /opt/itiyum
docker-compose restart
```

## Security Checklist

- [ ] Change default database password
- [ ] Set strong JWT_SECRET
- [ ] Configure CORS_ORIGIN to your domain only
- [ ] Enable firewall (allow only 80, 443, 22)
- [ ] Set up automated backups for PostgreSQL

