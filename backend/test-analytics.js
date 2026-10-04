/**
 * Analytics API Testing Script
 * Tests all analytics endpoints to ensure they work correctly
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test configuration
const TEST_CONFIG = {
  // You'll need to replace this with a valid auth token
  authToken: null,
  startDate: '2024-01-01',
  endDate: new Date().toISOString().split('T')[0],
};

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.blue);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

async function testEndpoint(name, method, url, data = null, expectSuccess = true) {
  try {
    logInfo(`Testing: ${name}...`);
    
    const config = {
      method,
      url: `${API_BASE_URL}${url}`,
      headers: {},
    };

    if (TEST_CONFIG.authToken) {
      config.headers.Authorization = `Bearer ${TEST_CONFIG.authToken}`;
    }

    if (data) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    const response = await axios(config);

    if (response.data.success) {
      logSuccess(`${name} - Passed`);
      log(`  Response keys: ${Object.keys(response.data.data || {}).join(', ')}`, colors.gray);
      return { success: true, data: response.data };
    } else {
      if (expectSuccess) {
        logError(`${name} - Failed: API returned success: false`);
      } else {
        logSuccess(`${name} - Passed (expected failure)`);
      }
      return { success: false, data: response.data };
    }
  } catch (error) {
    if (expectSuccess) {
      logError(`${name} - Failed`);
      if (error.response) {
        log(`  Status: ${error.response.status}`, colors.red);
        log(`  Message: ${error.response.data?.error?.message || error.message}`, colors.red);
      } else {
        log(`  Error: ${error.message}`, colors.red);
      }
    } else {
      logSuccess(`${name} - Passed (expected error)`);
    }
    return { success: false, error };
  }
}

async function runTests() {
  log('\n========================================', colors.blue);
  log('Analytics API Endpoint Testing', colors.blue);
  log('========================================\n', colors.blue);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
  };

  // Test 1: Dashboard Stats
  log('\n--- Dashboard Endpoints ---\n', colors.yellow);
  let result = await testEndpoint(
    'Get Dashboard Stats',
    'GET',
    '/dashboard/stats'
  );
  results.total++;
  if (result.success) results.passed++;
  else results.failed++;

  // Test 2-8: Analytics Endpoints
  log('\n--- Analytics Endpoints ---\n', colors.yellow);

  const reportTypes = [
    'sales',
    'stock',
    'delivery',
    'staff_performance',
    'debt',
    'daily_operations',
    'financial_summary',
  ];

  for (const reportType of reportTypes) {
    result = await testEndpoint(
      `Get ${reportType} Analytics`,
      'POST',
      '/reports/analytics',
      {
        type: reportType,
        startDate: TEST_CONFIG.startDate,
        endDate: TEST_CONFIG.endDate,
        filters: {},
      }
    );
    results.total++;
    if (result.success) results.passed++;
    else results.failed++;
  }

  // Test 9: Generate Report
  log('\n--- Report Generation ---\n', colors.yellow);
  result = await testEndpoint(
    'Generate Sales Report',
    'POST',
    '/reports',
    {
      type: 'sales',
      startDate: TEST_CONFIG.startDate,
      endDate: TEST_CONFIG.endDate,
      filters: {},
    }
  );
  results.total++;
  if (result.success) results.passed++;
  else results.failed++;

  let reportId = null;
  if (result.success && result.data?.data?.report?.id) {
    reportId = result.data.data.report.id;
  }

  // Test 10: Get All Reports
  result = await testEndpoint(
    'Get All Reports',
    'GET',
    '/reports'
  );
  results.total++;
  if (result.success) results.passed++;
  else results.failed++;

  // Test 11: Get Report by ID (if we have one)
  if (reportId) {
    result = await testEndpoint(
      'Get Report by ID',
      'GET',
      `/reports/${reportId}`
    );
    results.total++;
    if (result.success) results.passed++;
    else results.failed++;

    // Test 12: Delete Report
    result = await testEndpoint(
      'Delete Report',
      'DELETE',
      `/reports/${reportId}`
    );
    results.total++;
    if (result.success) results.passed++;
    else results.failed++;
  } else {
    logWarning('Skipping Report by ID tests (no report ID available)');
  }

  // Test Scheduled Reports
  log('\n--- Scheduled Reports ---\n', colors.yellow);
  
  result = await testEndpoint(
    'Get All Scheduled Reports',
    'GET',
    '/scheduled-reports'
  );
  results.total++;
  if (result.success) results.passed++;
  else results.failed++;

  result = await testEndpoint(
    'Create Scheduled Report',
    'POST',
    '/scheduled-reports',
    {
      title: 'Test Weekly Sales Report',
      reportType: 'sales',
      frequency: 'weekly',
      filters: {},
    }
  );
  results.total++;
  if (result.success) results.passed++;
  else results.failed++;

  let scheduledReportId = null;
  if (result.success && result.data?.data?.scheduledReport?.id) {
    scheduledReportId = result.data.data.scheduledReport.id;
  }

  if (scheduledReportId) {
    // Get scheduled report by ID
    result = await testEndpoint(
      'Get Scheduled Report by ID',
      'GET',
      `/scheduled-reports/${scheduledReportId}`
    );
    results.total++;
    if (result.success) results.passed++;
    else results.failed++;

    // Update scheduled report
    result = await testEndpoint(
      'Update Scheduled Report',
      'PATCH',
      `/scheduled-reports/${scheduledReportId}`,
      {
        title: 'Updated Weekly Sales Report',
        isActive: false,
      }
    );
    results.total++;
    if (result.success) results.passed++;
    else results.failed++;

    // Toggle scheduled report
    result = await testEndpoint(
      'Toggle Scheduled Report',
      'POST',
      `/scheduled-reports/${scheduledReportId}/toggle`,
      {}
    );
    results.total++;
    if (result.success) results.passed++;
    else results.failed++;

    // Delete scheduled report
    result = await testEndpoint(
      'Delete Scheduled Report',
      'DELETE',
      `/scheduled-reports/${scheduledReportId}`
    );
    results.total++;
    if (result.success) results.passed++;
    else results.failed++;
  } else {
    logWarning('Skipping Scheduled Report tests (no scheduled report ID available)');
  }

  // Summary
  log('\n========================================', colors.blue);
  log('Test Summary', colors.blue);
  log('========================================\n', colors.blue);
  log(`Total Tests: ${results.total}`);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  } else {
    logSuccess(`Failed: ${results.failed}`);
  }
  log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  if (results.failed === 0) {
    logSuccess('All tests passed! ✓');
  } else {
    logWarning('Some tests failed. Check the logs above for details.');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    logInfo('Checking if backend server is running...');
    await axios.get(`${API_BASE_URL.replace('/api', '')}`);
    logSuccess('Backend server is running\n');
    return true;
  } catch (error) {
    logError('Backend server is not running!');
    logWarning('Please start the backend server with: cd backend && npm start');
    return false;
  }
}

// Main execution
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    log('\nℹ️  Starting the server automatically...\n', colors.blue);
    logWarning('Note: You may need to authenticate first to pass all tests.');
    logWarning('Set TEST_CONFIG.authToken in this file with a valid JWT token.\n');
  } else {
    logWarning('\nNote: Some tests may fail due to authentication requirements.');
    logWarning('To test authenticated endpoints, set TEST_CONFIG.authToken\n');
  }

  if (serverRunning) {
    await runTests();
  }

  process.exit(0);
})();
