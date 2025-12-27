/**
 * Report Endpoints Test Suite
 *
 * Tests all 7 report endpoints with JSON/CSV export, filters, and multi-tenancy
 *
 * Usage:
 *   1. Start the backend server: PORT=5001 node server.js
 *   2. Run tests: node tests/report-endpoints.test.js
 *
 * Prerequisites:
 *   - Backend server running on port 5001
 *   - Admin user exists (admin@itiyum.com / Admin@123)
 */

const http = require('http');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5001';
const API_PREFIX = '/api/admin';

// Admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@itiyum.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

// Test results tracking
let passed = 0;
let failed = 0;
const results = [];

// Auth token (set after login)
let authToken = null;

// Helper to make HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    // Add auth token if available
    if (authToken) {
      defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        ...defaultHeaders,
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(data) 
            : data;
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test helper
async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: 'PASS' });
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    results.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

// ================================
// LOGIN / AUTHENTICATION
// ================================
async function login() {
  console.log(`🔐 Logging in as ${ADMIN_EMAIL}...`);

  try {
    const res = await request('POST', '/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });

    // Check for accessToken (API response format)
    if (res.status === 200 && res.data.accessToken) {
      authToken = res.data.accessToken;
      console.log('✅ Login successful!');
      console.log(`   User: ${res.data.user?.firstName} ${res.data.user?.lastName} (${res.data.user?.role})\n`);
      return true;
    } else {
      console.error('❌ Login failed:', res.data.error || res.data.message || 'Unknown error');
      console.error('   Response:', JSON.stringify(res.data).substring(0, 200));
      return false;
    }
  } catch (error) {
    console.error('❌ Login error:', error.message);
    return false;
  }
}

// ================================
// REPORT STATS TESTS
// ================================
async function testReportStats() {
  await test('GET /reports/stats - Returns report statistics', async () => {
    const res = await request('GET', `${API_PREFIX}/reports/stats`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.availableReports === 6, 'Should have 6 available reports');
    assert(typeof res.data.generatedThisMonth === 'number', 'generatedThisMonth should be a number');
  });
}

// ================================
// USERS REPORT TESTS
// ================================
async function testUsersReport() {
  await test('POST /reports/users - Returns JSON report', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/users`, { format: 'json' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.report === 'users', 'Report type should be users');
    assert(Array.isArray(res.data.data), 'Data should be an array');
    assert(res.data.generatedAt, 'Should have generatedAt timestamp');
  });

  await test('POST /reports/users - Returns CSV export', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/users`, { format: 'csv' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type']?.includes('text/csv'), 'Content-Type should be text/csv');
    assert(res.headers['content-disposition']?.includes('attachment'), 'Should have attachment disposition');
  });

  await test('POST /reports/users - Filters by date range', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/users`, {
      format: 'json',
      dateFrom: '2025-01-01',
      dateTo: '2025-12-31'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.filters.dateFrom === '2025-01-01', 'Should include dateFrom filter');
    assert(res.data.filters.dateTo === '2025-12-31', 'Should include dateTo filter');
  });
}

// ================================
// BUSINESSES REPORT TESTS
// ================================
async function testBusinessesReport() {
  await test('POST /reports/businesses - Returns JSON report', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/businesses`, { format: 'json' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.report === 'businesses', 'Report type should be businesses');
    assert(Array.isArray(res.data.data), 'Data should be an array');
  });

  await test('POST /reports/businesses - Returns CSV export', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/businesses`, { format: 'csv' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type']?.includes('text/csv'), 'Content-Type should be text/csv');
  });
}

// ================================
// BOOKINGS REPORT TESTS
// ================================
async function testBookingsReport() {
  await test('POST /reports/bookings - Returns JSON report', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/bookings`, { format: 'json' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.report === 'bookings', 'Report type should be bookings');
  });

  await test('POST /reports/bookings - Filters by status', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/bookings`, {
      format: 'json',
      status: 'completed'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.filters.status === 'completed', 'Should include status filter');
  });

  await test('POST /reports/bookings - CSV export', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/bookings`, { format: 'csv' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type']?.includes('text/csv'), 'Content-Type should be text/csv');
  });
}

// ================================
// FINANCIAL REPORT TESTS
// ================================
async function testFinancialReport() {
  await test('POST /reports/financial - Returns JSON report with summary', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/financial`, { format: 'json' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.report === 'financial', 'Report type should be financial');
    assert(res.data.summary, 'Should have summary object');
    assert(typeof res.data.summary.totalRevenue === 'number', 'Should have totalRevenue');
    assert(res.data.data.subscriptions, 'Should have subscriptions data');
    assert(res.data.data.bookingCommissions, 'Should have bookingCommissions data');
  });

  await test('POST /reports/financial - CSV export', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/financial`, { format: 'csv' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type']?.includes('text/csv'), 'Content-Type should be text/csv');
  });
}

// ================================
// ANALYTICS REPORT TESTS
// ================================
async function testAnalyticsReport() {
  await test('POST /reports/analytics - Returns JSON report with metrics', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/analytics`, { format: 'json' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.report === 'analytics', 'Report type should be analytics');
    assert(res.data.summary, 'Should have summary object');
    assert(res.data.data.userMetrics, 'Should have userMetrics');
    assert(res.data.data.businessMetrics, 'Should have businessMetrics');
    assert(res.data.data.bookingMetrics, 'Should have bookingMetrics');
  });

  await test('POST /reports/analytics - CSV export with monthly data', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/analytics`, { format: 'csv' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type']?.includes('text/csv'), 'Content-Type should be text/csv');
    assert(typeof res.data === 'string', 'CSV should be a string');
    assert(res.data.includes('Month'), 'CSV should have Month header');
  });
}

// ================================
// ACTIVITY REPORT TESTS
// ================================
async function testActivityReport() {
  await test('POST /reports/activity - Returns JSON report', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/activity`, { format: 'json' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.report === 'activity', 'Report type should be activity');
    assert(Array.isArray(res.data.data) || res.data.message, 'Should have data array or message');
  });

  await test('POST /reports/activity - CSV export', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/activity`, { format: 'csv' });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.headers['content-type']?.includes('text/csv'), 'Content-Type should be text/csv');
  });

  await test('POST /reports/activity - Filters by action type', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/activity`, {
      format: 'json',
      actionType: 'login'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.filters.actionType === 'login', 'Should include actionType filter');
  });
}

// ================================
// MULTI-TENANCY TESTS
// ================================
async function testMultiTenancy() {
  await test('POST /reports/users - Filters by tenant', async () => {
    const res = await request('POST', `${API_PREFIX}/reports/users`, {
      format: 'json',
      tenant: 'itiyum'
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    // If tenant exists, it should be in filters
    if (res.data.filters.tenant) {
      assert(res.data.filters.tenant === 'itiyum', 'Should filter by tenant');
    }
  });
}

// ================================
// RUN ALL TESTS
// ================================
async function runAllTests() {
  console.log('\n📊 Report Endpoints Test Suite');
  console.log('================================\n');
  console.log(`Testing against: ${BASE_URL}${API_PREFIX}\n`);

  // Login first
  const loggedIn = await login();
  if (!loggedIn) {
    console.error('\n⚠️  Cannot run tests without authentication');
    console.log('Make sure the admin user exists: admin@itiyum.com / Admin@123');
    process.exit(1);
  }

  try {
    await testReportStats();
    await testUsersReport();
    await testBusinessesReport();
    await testBookingsReport();
    await testFinancialReport();
    await testAnalyticsReport();
    await testActivityReport();
    await testMultiTenancy();
  } catch (error) {
    console.error('\n⚠️  Test suite error:', error.message);
  }

  console.log('\n================================');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total:  ${passed + failed}`);
  console.log('================================\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests();

