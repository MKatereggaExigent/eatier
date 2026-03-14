#!/bin/bash

echo "=========================================="
echo "Checking Specialist Bookings Data"
echo "=========================================="

echo ""
echo "1. All specialist bookings with details:"
echo "=========================================="
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    id, 
    booking_reference, 
    client_id, 
    specialist_id, 
    booking_date, 
    guest_count, 
    event_type, 
    status, 
    created_at 
FROM specialist_bookings 
ORDER BY created_at DESC;
"

echo ""
echo "2. Checking if specialist_id matches users.id or specialist_profiles.id:"
echo "=========================================="
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    sb.id as booking_id,
    sb.specialist_id,
    u.id as user_id,
    u.first_name || ' ' || u.last_name as user_name,
    sp.id as specialist_profile_id,
    sp.specialty
FROM specialist_bookings sb
LEFT JOIN users u ON sb.specialist_id = u.id
LEFT JOIN specialist_profiles sp ON sb.specialist_id = sp.id
ORDER BY sb.created_at DESC;
"

echo ""
echo "3. All users with Specialist role:"
echo "=========================================="
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    u.id,
    u.first_name || ' ' || u.last_name as name,
    u.email,
    r.name as role
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE LOWER(r.name) = 'specialist';
"

echo ""
echo "4. All specialist_profiles:"
echo "=========================================="
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    sp.id as profile_id,
    sp.user_id,
    u.first_name || ' ' || u.last_name as user_name,
    sp.specialty,
    sp.is_available
FROM specialist_profiles sp
JOIN users u ON sp.user_id = u.id;
"

echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo ""
echo "This will show if specialist_id in bookings is:"
echo "  - A user.id (wrong - should be specialist_profiles.id)"
echo "  - A specialist_profiles.id (correct)"
echo "  - NULL (missing)"
echo ""

