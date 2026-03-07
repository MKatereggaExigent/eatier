#!/usr/bin/env bash

# Check business data in database

echo "=========================================="
echo "🔍 CHECK BUSINESS DATA IN DATABASE"
echo "=========================================="
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Check running containers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker ps | grep itiyum

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Check business data in database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    id,
    business_name,
    phone,
    city,
    state,
    postal_code,
    website,
    description,
    updated_at
FROM businesses 
WHERE id = '9d1cd461-34b7-43f2-abc4-4f8e0e1772d4';
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Check ALL businesses in database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    id,
    business_name,
    phone,
    city,
    state,
    email
FROM businesses 
ORDER BY created_at DESC 
LIMIT 5;
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Check backend logs for recent PUT requests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker logs itiyum-backend --tail 100 | grep -E "PUT.*my-business|Error updating business"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Test manual UPDATE query"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Testing if we can manually update the business..."
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
UPDATE businesses 
SET 
    phone = '+27123456789',
    city = 'Cape Town',
    state = 'Western Cape',
    postal_code = '8001',
    website = 'https://test.com',
    description = 'Test description',
    updated_at = CURRENT_TIMESTAMP
WHERE id = '9d1cd461-34b7-43f2-abc4-4f8e0e1772d4'
RETURNING id, business_name, phone, city, state;
"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Verify the manual update worked"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec itiyum-postgres psql -U itiyum_user -d itiyum_platform -c "
SELECT 
    business_name,
    phone,
    city,
    state,
    postal_code,
    website,
    description
FROM businesses 
WHERE id = '9d1cd461-34b7-43f2-abc4-4f8e0e1772d4';
"

echo ""
echo "=========================================="
echo "✅ DONE"
echo "=========================================="
echo ""
echo "If the manual update worked, then the issue is in the API endpoint."
echo "If it didn't work, then there's a database permission issue."
echo ""

