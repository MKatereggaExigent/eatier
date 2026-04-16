#!/usr/bin/env python3
import re

# Read user dashboard SCSS  
with open('src/app/pages/user/dashboard/dashboard.component.scss', 'r') as f:
    content = f.read()

# Replace class names
content = content.replace('.user-dashboard', '.business-dashboard-wrapper')
content = content.replace('.user-nav', '.business-nav')
content = content.replace('USER DASHBOARD', 'BUSINESS DASHBOARD')

# Write to business dashboard
with open('src/app/pages/business/dashboard/dashboard.component.scss', 'w') as f:
    f.write(content)

print("✅ SCSS copied successfully!")
