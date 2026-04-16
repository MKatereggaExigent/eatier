#!/bin/bash

# ====================================
# Cleanup Test Notifications (Docker)
# ====================================

set -e

echo "🗑️  Cleaning up Test Notifications"
echo "==================================="

docker exec itiyum-postgres psql -U postgres -d itiyum_platform << 'EOF'

-- Count before
\echo 'Before cleanup:'
SELECT COUNT(*) as test_notifications FROM notifications WHERE message LIKE '%[TEST]%';

-- Delete
DELETE FROM notifications WHERE message LIKE '%[TEST]%';

-- Count after
\echo ''
\echo 'After cleanup:'
SELECT COUNT(*) as remaining_test_notifications FROM notifications WHERE message LIKE '%[TEST]%';

EOF

echo ""
echo "✅ Test notifications cleaned up!"
