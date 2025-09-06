#!/usr/bin/env node

/**
 * Jira Connection Test Script
 * Tests the connection to Jira and validates all endpoints
 */

const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

// Create axios instance for Jira API
const jiraApi = axios.create({
  baseURL: `${JIRA_BASE_URL}/rest/api/3`,
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN
  },
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

async function testConnection() {
  console.log('🔗 Testing Jira Connection...\n');

  const tests = [
    {
      name: 'Authentication',
      test: async () => {
        const response = await jiraApi.get('/myself');
        return {
          success: true,
          data: `Connected as: ${response.data.displayName} (${response.data.emailAddress})`
        };
      }
    },
    {
      name: 'Projects Access',
      test: async () => {
        const response = await jiraApi.get('/project');
        return {
          success: true,
          data: `Found ${response.data.length} projects: ${response.data.map(p => p.key).join(', ')}`
        };
      }
    },
    {
      name: 'Search Assigned Issues',
      test: async () => {
        const response = await jiraApi.get('/search', {
          params: {
            jql: 'assignee = currentUser()',
            maxResults: 5
          }
        });
        return {
          success: true,
          data: `Found ${response.data.total} assigned issues (showing ${response.data.issues.length})`
        };
      }
    },
    {
      name: 'Search Created Issues',
      test: async () => {
        const response = await jiraApi.get('/search', {
          params: {
            jql: 'reporter = currentUser()',
            maxResults: 5
          }
        });
        return {
          success: true,
          data: `Found ${response.data.total} created issues (showing ${response.data.issues.length})`
        };
      }
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      console.log(`🧪 Testing ${test.name}...`);
      const result = await test.test();
      console.log(`✅ ${test.name}: ${result.data}\n`);
    } catch (error) {
      allPassed = false;
      console.log(`❌ ${test.name}: Failed`);
      if (error.response) {
        console.log(`   Status: ${error.response.status} ${error.response.statusText}`);
        console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}\n`);
      } else {
        console.log(`   Error: ${error.message}\n`);
      }
    }
  }

  if (allPassed) {
    console.log('🎉 All tests passed! Your Jira connection is working correctly.');
    console.log('\n🚀 Next steps:');
    console.log('   1. Run: node scripts/setup-test-data.js (to create sample tickets)');
    console.log('   2. Start backend: cd backend && npm run dev');
    console.log('   3. Start frontend: npm start');
  } else {
    console.log('❌ Some tests failed. Please check your configuration.');
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Verify JIRA_BASE_URL has no trailing slash');
    console.log('   • Check JIRA_EMAIL matches your Atlassian account');
    console.log('   • Ensure JIRA_API_TOKEN is valid and not expired');
    console.log('   • Confirm you have necessary permissions in Jira');
  }
}

async function testBackendConnection() {
  console.log('\n🔧 Testing Backend Connection...\n');

  const backendUrl = 'http://192.168.146.131:3001';

  const backendTests = [
    {
      name: 'Backend Health Check',
      url: `${backendUrl}/health`
    },
    {
      name: 'Backend User Info',
      url: `${backendUrl}/api/jira/user`
    },
    {
      name: 'Backend Assigned Tickets',
      url: `${backendUrl}/api/jira/tickets/assigned`
    },
    {
      name: 'Backend Created Tickets',
      url: `${backendUrl}/api/jira/tickets/created`
    }
  ];

  for (const test of backendTests) {
    try {
      console.log(`🧪 Testing ${test.name}...`);
      const response = await axios.get(test.url, { timeout: 5000 });
      console.log(`✅ ${test.name}: Status ${response.status}\n`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log(`⚠️  ${test.name}: Backend not running`);
        console.log('   Start backend with: cd backend && npm run dev\n');
      } else {
        console.log(`❌ ${test.name}: ${error.message}\n`);
      }
    }
  }
}

// Main execution
async function main() {
  // Check environment variables
  if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.error('❌ Missing required environment variables!');
    console.log('Please ensure the following are set in backend/.env:');
    console.log('   • JIRA_BASE_URL=https://your-domain.atlassian.net');
    console.log('   • JIRA_EMAIL=your-email@domain.com');
    console.log('   • JIRA_API_TOKEN=your-api-token');
    console.log('\nCreate backend/.env from backend/.env.example and fill in your details.');
    process.exit(1);
  }

  console.log('🔍 Configuration Check:');
  console.log(`   • JIRA_BASE_URL: ${JIRA_BASE_URL}`);
  console.log(`   • JIRA_EMAIL: ${JIRA_EMAIL}`);
  console.log(`   • JIRA_API_TOKEN: ${'*'.repeat(JIRA_API_TOKEN.length)}\n`);

  await testConnection();
  await testBackendConnection();
}

main().catch(console.error);
