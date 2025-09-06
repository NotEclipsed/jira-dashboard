#!/usr/bin/env node

/**
 * Secure Backend Startup Script
 * Validates environment and starts the server with proper error handling
 */

const fs = require('fs');
const path = require('path');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Missing .env file!');
  console.log('Please copy .env.example to .env and configure your settings:');
  console.log('  cp .env.example .env');
  console.log('');
  console.log('Required variables:');
  console.log('  - JIRA_BASE_URL');
  console.log('  - JIRA_EMAIL');
  console.log('  - JIRA_API_TOKEN');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Validate required environment variables
const requiredEnvVars = [
  'JIRA_BASE_URL',
  'JIRA_EMAIL',
  'JIRA_API_TOKEN'
];

const missing = requiredEnvVars.filter(env => !process.env[env]);

if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.log('Please check your .env file and ensure all required variables are set.');
  process.exit(1);
}

// Validate Jira URL format
try {
  new URL(process.env.JIRA_BASE_URL);
} catch (error) {
  console.error('❌ Invalid JIRA_BASE_URL format. Please provide a valid URL.');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(process.env.JIRA_EMAIL)) {
  console.error('❌ Invalid JIRA_EMAIL format. Please provide a valid email address.');
  process.exit(1);
}

console.log('✅ Environment validation passed');
console.log('🚀 Starting Jira Dashboard Backend...');

// Start the server
try {
  require('../server');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  process.exit(1);
}
