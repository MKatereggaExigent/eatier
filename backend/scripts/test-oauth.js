#!/usr/bin/env node

/**
 * OAuth Testing Script
 * 
 * This script tests all 8 OAuth providers to ensure they are properly configured
 * and the endpoints are working correctly.
 * 
 * Usage:
 *   node scripts/test-oauth.js
 *   node scripts/test-oauth.js --provider=google
 *   node scripts/test-oauth.js --verbose
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath });
}

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/auth`;

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  provider: null,
  verbose: args.includes('--verbose') || args.includes('-v')
};

// Extract provider if specified
const providerArg = args.find(arg => arg.startsWith('--provider='));
if (providerArg) {
  options.provider = providerArg.split('=')[1];
}

// All OAuth providers
const providers = [
  'google',
  'facebook',
  'github',
  'linkedin',
  'microsoft',
  'apple',
  'twitter',
  'instagram'
];

// Test results
const results = {
  passed: [],
  failed: [],
  notConfigured: []
};

// Helper functions
function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logVerbose(message) {
  if (options.verbose) {
    console.log(`  ${colors.cyan}${message}${colors.reset}`);
  }
}

// Test a single provider
async function testProvider(provider) {
  log(`\n🔍 Testing ${provider.toUpperCase()}...`, 'blue');
  
  try {
    // Test 1: Check if provider endpoint exists
    logVerbose(`Testing endpoint: ${API_URL}/${provider}`);
    
    const response = await axios.get(`${API_URL}/${provider}`, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    });
    
    // If we get here, the endpoint exists and redirects
    if (response.status === 302 || response.headers.location) {
      const redirectUrl = response.headers.location;
      
      // Check if it's a "not configured" redirect
      if (redirectUrl && redirectUrl.includes('not_configured')) {
        log(`  ⚠️  ${provider.toUpperCase()} - Not configured`, 'yellow');
        logVerbose(`Redirect URL: ${redirectUrl}`);
        results.notConfigured.push(provider);
        return false;
      }
      
      // Check if it redirects to the OAuth provider
      const expectedDomains = {
        google: 'accounts.google.com',
        facebook: 'facebook.com',
        github: 'github.com',
        linkedin: 'linkedin.com',
        microsoft: 'login.microsoftonline.com',
        apple: 'appleid.apple.com',
        twitter: 'twitter.com',
        instagram: 'instagram.com'
      };
      
      if (redirectUrl && redirectUrl.includes(expectedDomains[provider])) {
        log(`  ✅ ${provider.toUpperCase()} - Configured and working`, 'green');
        logVerbose(`Redirects to: ${redirectUrl.substring(0, 80)}...`);
        results.passed.push(provider);
        return true;
      }
      
      log(`  ⚠️  ${provider.toUpperCase()} - Unexpected redirect`, 'yellow');
      logVerbose(`Redirect URL: ${redirectUrl}`);
      results.failed.push(provider);
      return false;
    }
    
    log(`  ❌ ${provider.toUpperCase()} - No redirect`, 'red');
    results.failed.push(provider);
    return false;
    
  } catch (error) {
    if (error.response) {
      if (error.response.status === 302) {
        // Handle redirect
        const redirectUrl = error.response.headers.location;
        
        if (redirectUrl && redirectUrl.includes('not_configured')) {
          log(`  ⚠️  ${provider.toUpperCase()} - Not configured`, 'yellow');
          results.notConfigured.push(provider);
          return false;
        }
      }
      
      log(`  ❌ ${provider.toUpperCase()} - HTTP ${error.response.status}`, 'red');
      logVerbose(`Error: ${error.message}`);
    } else {
      log(`  ❌ ${provider.toUpperCase()} - ${error.message}`, 'red');
    }
    
    results.failed.push(provider);
    return false;
  }
}

// Main test function
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         OAuth Provider Testing - Itiyum Platform           ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\n📍 Testing against: ${BASE_URL}`, 'blue');
  log(`📊 Total providers: ${providers.length}\n`);
  
  // Test specific provider or all providers
  const providersToTest = options.provider ? [options.provider] : providers;
  
  for (const provider of providersToTest) {
    await testProvider(provider);
  }
  
  // Print summary
  log('\n' + '═'.repeat(60), 'cyan');
  log('📊 TEST SUMMARY', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  log(`\n✅ Configured and Working: ${results.passed.length}`, 'green');
  if (results.passed.length > 0) {
    results.passed.forEach(p => log(`   - ${p}`, 'green'));
  }
  
  log(`\n⚠️  Not Configured: ${results.notConfigured.length}`, 'yellow');
  if (results.notConfigured.length > 0) {
    results.notConfigured.forEach(p => log(`   - ${p}`, 'yellow'));
  }
  
  log(`\n❌ Failed: ${results.failed.length}`, 'red');
  if (results.failed.length > 0) {
    results.failed.forEach(p => log(`   - ${p}`, 'red'));
  }
  
  log('\n' + '═'.repeat(60) + '\n', 'cyan');
  
  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

