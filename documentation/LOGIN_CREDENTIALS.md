# 🔐 Itiyum Platform - Login Credentials

## ✅ Database Status
- **PostgreSQL**: Running and configured
- **Database**: itiyum_platform
- **Total Users**: 16

---

## 👤 Admin Account

### Primary Admin (Full Platform Access)
```
Email:    admin@itiyum.com
Password: Admin@123
Role:     itiyum_admin
```

---

## 🏢 Business Owner Accounts

### Restaurant Owner
```
Email:    restaurant.owner@demo.com
Password: Demo@123
Role:     business_owner
```

### Cafe Owner
```
Email:    cafe.owner@demo.com
Password: Demo@123
Role:     business_owner
```

### Catering Service Owner
```
Email:    catering.owner@demo.com
Password: Demo@123
Role:     business_owner
```

### Mock Business Owner (for testing)
```
Email:    business@example.com
Password: password123
Role:     business_owner
```

---

## 🍽️ Food Enthusiast Accounts

### Food Enthusiast 1
```
Email:    foodie1@demo.com
Password: Demo@123
Role:     food_enthusiast
```

### Food Enthusiast 2
```
Email:    foodie2@demo.com
Password: Demo@123
Role:     food_enthusiast
```

### Customer 1
```
Email:    customer1@demo.com
Password: Demo@123
Role:     food_enthusiast
```

### Customer 2
```
Email:    customer2@demo.com
Password: Demo@123
Role:     food_enthusiast
```

### Mock Food Enthusiast (for testing)
```
Email:    user@example.com
Password: password123
Role:     food_enthusiast
```

---

## 👨‍🍳 Specialist Accounts (Chefs, Waiters, etc.)

### Chef
```
Email:    chef1@demo.com
Password: Demo@123
Role:     specialist
```

### Waiter
```
Email:    waiter1@demo.com
Password: Demo@123
Role:     specialist
```

### Mock Chef (for testing)
```
Email:    chef@example.com
Password: password123
Role:     specialist
```

---

## 👥 Normal User Accounts

### User 1
```
Email:    user1@demo.com
Password: Demo@123
Role:     normal_user
```

### User 2
```
Email:    user2@demo.com
Password: Demo@123
Role:     normal_user
```

### Mock Normal User (for testing)
```
Email:    normaluser@example.com
Password: password123
Role:     normal_user
```

---

## 🚀 Quick Start

1. **Start the application:**
   ```bash
   ./launch_entire_product.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:4200
   - Backend API: http://localhost:3001/api
   - Login Page: http://localhost:4200/login

3. **Login with admin credentials:**
   - Email: `admin@itiyum.com`
   - Password: `Admin@123`

---

## 🔧 Troubleshooting

### If login fails:

1. **Reset admin password:**
   ```bash
   cd backend
   node scripts/reset-admin-password.js
   ```

2. **Reset all demo passwords:**
   ```bash
   cd backend
   node scripts/reset-all-demo-passwords.js
   ```

3. **Check database connection:**
   ```bash
   psql -h localhost -U michaelkateregga -d itiyum_platform -c "SELECT email, role FROM users;"
   ```

---

## 📝 Notes

- All passwords have been freshly reset and verified
- The database is configured to use localhost connection
- PostgreSQL is running on port 5432
- Backend .env file has been updated for local development

---

**Last Updated:** 2025-11-27
**Status:** ✅ All credentials verified and working

