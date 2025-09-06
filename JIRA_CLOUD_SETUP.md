# 🌩️ Jira Cloud Test Instance Setup Guide

Complete guide for creating a free Jira Cloud instance with sample tickets for testing the secure Jira Dashboard.

## 🎯 Overview

This guide will help you:
1. Create a free Atlassian Cloud account
2. Set up a Jira Software instance
3. Configure API access
4. Create sample projects and tickets
5. Test the dashboard connection

## 🚀 Part 1: Create Atlassian Cloud Account

### Step 1: Sign Up for Atlassian Cloud
1. **Visit**: [https://www.atlassian.com/try](https://www.atlassian.com/try)
2. **Click**: "Get Jira Software free"
3. **Enter**: Your email address
4. **Create**: Strong password
5. **Site Name**: Choose your site name (e.g., `yourname-test` becomes `yourname-test.atlassian.net`)
6. **Verify**: Your email address

### Step 2: Initial Setup
1. **Select**: "Free plan" (up to 10 users)
2. **Choose**: "Software development" as your goal
3. **Project**: Select "Scrum" template
4. **Project Name**: "Test Dashboard Project"
5. **Project Key**: "TDP"

## 🔑 Part 2: Generate API Token

### Step 1: Create API Token
1. **Visit**: [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. **Click**: "Create API token"
3. **Label**: "Jira Dashboard Test"
4. **Copy**: The token (save it securely!)

### Step 2: Note Your Credentials
- **Jira Base URL**: `https://yoursite.atlassian.net`
- **Email**: Your Atlassian account email
- **API Token**: The token you just created

## 📊 Part 3: Auto-Create Sample Data

I've created an automated script to generate test data for you!

### Quick Setup Script
Once you have your Jira credentials, use this automated setup:

```bash
# On your VM, run this script
cd ~/apps/jira-dashboard
node scripts/setup-test-data.js
```

This will create:
- 2 test projects
- 10+ sample tickets with various statuses
- Comments on tickets
- Mixed priorities and assignments

## ✅ Quick Test
1. Update your `.env` with Jira credentials
2. Run: `npm run test-connection`
3. Access dashboard at `http://VM_IP:3000`

---

**Next**: Run the automated setup and test the application!
