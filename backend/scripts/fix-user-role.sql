-- Script to fix user role segregation issue
-- User: ysicwebu@yahoo.com should be Specialist, not Normal User

-- Step 1: Find the user
SELECT id, email, first_name, last_name 
FROM users 
WHERE email = 'ysicwebu@yahoo.com';

-- Step 2: Check current role assignment
SELECT 
  u.id as user_id, 
  u.email, 
  u.first_name, 
  u.last_name,
  r.id as role_id,
  r.name as role_name,
  ur.created_at as role_assigned_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'ysicwebu@yahoo.com';

-- Step 3: Show all available roles
SELECT id, name, description FROM roles ORDER BY name;

-- Step 4: Fix the role assignment (run this after confirming steps 1-3)
-- First, delete any existing role assignment for this user
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM users WHERE email = 'ysicwebu@yahoo.com');

-- Then, assign the Specialist role
INSERT INTO user_roles (user_id, role_id)
SELECT 
  u.id as user_id,
  r.id as role_id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'ysicwebu@yahoo.com'
  AND r.name = 'Specialist';

-- Step 5: Verify the fix
SELECT 
  u.id as user_id, 
  u.email, 
  u.first_name, 
  u.last_name,
  r.name as role_name
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'ysicwebu@yahoo.com';

