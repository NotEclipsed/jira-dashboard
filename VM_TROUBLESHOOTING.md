# 🔧 VM Troubleshooting Guide

**Issue**: Step 6 test connection succeeds to Jira but fails to backend, and test data creation fails

## 🎯 Root Causes Identified

1. **Backend requires authentication** - The backend has enterprise security with session management
2. **Missing environment configuration** - Backend .env file not created
3. **Test data creation permission issues** - Jira API permissions or rate limiting

---

## 🚀 Quick Fix Commands (Run on VM)

### Step 1: Create Backend Environment File
```bash
cd ~/jira-dashboard/backend
cp .env.example .env
vim .env
```

**Configure these required variables in backend/.env**:
```env
# Jira API Configuration
JIRA_BASE_URL=https://yourname-test.atlassian.net
JIRA_EMAIL=your-email@domain.com  
JIRA_API_TOKEN=your-api-token-here

# Network Configuration - IMPORTANT!
PORT=3001
CORS_ORIGIN=http://YOUR_WINDOWS_HOST_IP:3000
NODE_ENV=development

# Simple Authentication (for testing)
JWT_SECRET=test-jwt-secret-for-development-only
SESSION_SECRET=test-session-secret-for-development-only

# Disable enterprise features for quick testing
PHI_DETECTION_ENABLED=false
COMPLIANCE_MODE=development

# Default admin account
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=ChangeMe123!
DEFAULT_ADMIN_EMAIL=admin@localhost
```

### Step 2: Create Frontend Environment File
```bash
cd ~/jira-dashboard
cp .env.example .env
vim .env
```

**Configure frontend/.env**:
```env
REACT_APP_BACKEND_URL=http://YOUR_VM_IP:3001
```

### Step 3: Find Your IP Addresses
```bash
# On VM - find your VM IP
ip addr show | grep "inet " | grep -v 127.0.0.1
```
```powershell
# On Windows host - find your host IP
ipconfig | findstr IPv4
```

### Step 4: Install Dependencies & Build
```bash
cd ~/jira-dashboard
npm run install-all
npm run build
```

### Step 5: Start Services
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 logs
```

### Step 6: Test the Stack
```bash
# Test health endpoint (should work now)
curl http://localhost:3001/health

# Login to get session (new requirement)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeMe123!"}'
```

---

## 🔍 Debugging Test Data Issues

The test data creation failures happen because the script tries to create tickets but hits these issues:

### Issue Analysis:
- **"failed to create: User can view assigned tickets"** = Jira API permission or field validation error
- **Comments working** = Basic API access is fine, issue creation has different requirements

### Option A: Skip Test Data, Create Manual Tickets
Instead of running the automated script, create test tickets manually:

1. Go to your Jira Cloud instance
2. Create 3-5 sample tickets in your project
3. Assign some to yourself
4. Add some comments
5. Move some to "In Progress"

### Option B: Fix the Test Data Script
The issue is likely missing required fields or issue type problems:

```bash
cd ~/jira-dashboard

# Check what issue types are available in your project
node -e "
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const jiraApi = axios.create({
  baseURL: \`\${process.env.JIRA_BASE_URL}/rest/api/3\`,
  auth: { username: process.env.JIRA_EMAIL, password: process.env.JIRA_API_TOKEN }
});

jiraApi.get('/project').then(res => {
  const project = res.data[0];
  console.log('Project Key:', project.key);
  return jiraApi.get(\`/project/\${project.key}\`);
}).then(res => {
  console.log('Available Issue Types:');
  res.data.issueTypes.forEach(type => console.log('- ', type.name));
}).catch(console.error);
"
```

### Option C: Simplified Test Data Script
Create a simpler version that only creates basic tasks:

```bash
cd ~/jira-dashboard

# Create simple test ticket
node -e "
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const jiraApi = axios.create({
  baseURL: \`\${process.env.JIRA_BASE_URL}/rest/api/3\`,
  auth: { username: process.env.JIRA_EMAIL, password: process.env.JIRA_API_TOKEN }
});

async function createSimpleTicket() {
  try {
    const projects = await jiraApi.get('/project');
    const projectKey = projects.data[0].key;
    
    const issue = {
      fields: {
        project: { key: projectKey },
        summary: 'Test Dashboard Connection',
        description: {
          type: 'doc', version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test ticket for dashboard' }] }]
        },
        issuetype: { name: 'Task' }
      }
    };
    
    const result = await jiraApi.post('/issue', issue);
    console.log('✅ Created test ticket:', result.data.key);
  } catch(error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}
createSimpleTicket();
"
```

---

## 🏥 System Health Checks

### Check Backend Status
```bash
pm2 status
pm2 logs jira-dashboard-backend --lines 50
```

### Check Frontend Status  
```bash
pm2 logs jira-dashboard-frontend --lines 20
curl http://localhost:3000
```

### Check Network Connectivity
```bash
# Get VM IP
ip addr show

# Test internal connectivity
curl http://localhost:3001/health
curl http://localhost:3000

# Test external access from Windows host
# Replace VM_IP with your actual VM IP
curl http://VM_IP:3001/health
curl http://VM_IP:3000
```

### Check Firewall
```bash
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 3001
```

---

## 🎉 Expected Working State

After these fixes:

✅ **Backend Health**: `curl http://VM_IP:3001/health` returns JSON status  
✅ **Frontend**: `http://VM_IP:3000` shows React login screen  
✅ **Login**: Can login with admin/ChangeMe123!  
✅ **Dashboard**: Shows your Jira tickets after login  
✅ **Comments**: Adding comments works  

---

## 🔄 Alternative: Quick Demo Mode

If you want to bypass all the enterprise security for quick testing:

### Create Minimal Backend Configuration
```bash
cd ~/jira-dashboard/backend
cat > .env << 'EOF'
JIRA_BASE_URL=https://yourname-test.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your-api-token-here
PORT=3001
CORS_ORIGIN=http://YOUR_WINDOWS_IP:3000
NODE_ENV=development
PHI_DETECTION_ENABLED=false
SESSION_TIMEOUT=86400000
JWT_SECRET=demo-secret-123
SESSION_SECRET=demo-session-123
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin
EOF
```

### Test Sequence
```bash
# Restart services
pm2 restart all
sleep 5

# Test health
curl http://localhost:3001/health

# Test login  
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  -c cookies.txt

# Test API with session
curl -b cookies.txt http://localhost:3001/api/jira/user
```

---

## 🚨 Common Fixes for Remaining Issues

### If Backend Won't Start:
```bash
cd ~/jira-dashboard/backend
node scripts/start.js
# Look for specific error messages
```

### If Frontend Shows Blank Page:
```bash
# Check if built correctly
ls -la ~/jira-dashboard/build/
# Rebuild if needed
cd ~/jira-dashboard && npm run build
pm2 restart jira-dashboard-frontend
```

### If Can't Access from Windows:
```bash
# Check VM network adapter settings in VMware
# Ensure it's set to NAT or Bridged, not Host-only
sudo ufw status
sudo ufw allow from 192.168.0.0/16
```

### If Login Fails:
```bash
# Check backend logs for auth errors
pm2 logs jira-dashboard-backend | grep -i auth
# Verify default admin account is created
```

---

## 📞 Still Having Issues?

Run this diagnostic command on the VM:
```bash
echo "=== DIAGNOSTIC REPORT ==="
echo "VM IP: $(ip route get 8.8.8.8 | sed -n '/src/{s/.*src *\([^ ]*\).*/\1/p;q}')"
echo "Backend Status: $(curl -s http://localhost:3001/health | head -c 50)"
echo "PM2 Status:"
pm2 status
echo "Environment Check:"
ls -la ~/jira-dashboard/backend/.env ~/jira-dashboard/.env
echo "Port Check:"
sudo netstat -tlnp | grep -E ":(3000|3001)"
```

**The key insight**: This is an enterprise-grade secure application, not a simple demo. You need to authenticate first, then access the Jira endpoints. The test data failures are secondary - focus on getting the authentication and basic dashboard working first!

# 🔧 VM Troubleshooting Guide

**Issue**: Step 6 test connection succeeds to Jira but fails to backend, and test data creation fails

## 🎯 Root Causes Identified

1. **Backend requires authentication** - The backend has enterprise security with session management
2. **Missing environment configuration** - Backend .env file not created
3. **Test data creation permission issues** - Jira API permissions or rate limiting

---

## 🚀 Quick Fix Commands (Run on VM)

### Step 1: Create Backend Environment File
```bash
cd ~/jira-dashboard/backend
cp .env.example .env
vim .env
```

**Configure these required variables in backend/.env**:
```env
# Jira API Configuration
JIRA_BASE_URL=https://yourname-test.atlassian.net
JIRA_EMAIL=your-email@domain.com  
JIRA_API_TOKEN=your-api-token-here

# Network Configuration - IMPORTANT!
PORT=3001
CORS_ORIGIN=http://YOUR_WINDOWS_HOST_IP:3000
NODE_ENV=development

# Simple Authentication (for testing)
JWT_SECRET=test-jwt-secret-for-development-only
SESSION_SECRET=test-session-secret-for-development-only

# Disable enterprise features for quick testing
PHI_DETECTION_ENABLED=false
COMPLIANCE_MODE=development

# Default admin account
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=ChangeMe123!
DEFAULT_ADMIN_EMAIL=admin@localhost
```

### Step 2: Create Frontend Environment File
```bash
cd ~/jira-dashboard
cp .env.example .env
vim .env
```

**Configure frontend/.env**:
```env
REACT_APP_BACKEND_URL=http://YOUR_VM_IP:3001
```

### Step 3: Find Your IP Addresses
```bash
# On VM - find your VM IP
ip addr show | grep "inet " | grep -v 127.0.0.1
```
```powershell
# On Windows host - find your host IP
ipconfig | findstr IPv4
```

### Step 4: Install Dependencies & Build
```bash
cd ~/jira-dashboard
npm run install-all
npm run build
```

### Step 5: Start Services
```bash
# Create logs directory
mkdir -p logs

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 logs
```

### Step 6: Test the Stack
```bash
# Test health endpoint (should work now)
curl http://localhost:3001/health

# Login to get session (new requirement)
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"ChangeMe123!"}'
```

---

## 🔍 Debugging Test Data Issues

The test data creation failures happen because the script tries to create tickets but hits these issues:

### Issue Analysis:
- **"failed to create: User can view assigned tickets"** = Jira API permission or field validation error
- **Comments working** = Basic API access is fine, issue creation has different requirements

### Option A: Skip Test Data, Create Manual Tickets
Instead of running the automated script, create test tickets manually:

1. Go to your Jira Cloud instance
2. Create 3-5 sample tickets in your project
3. Assign some to yourself
4. Add some comments
5. Move some to "In Progress"

### Option B: Fix the Test Data Script
The issue is likely missing required fields or issue type problems:

```bash
cd ~/jira-dashboard

# Check what issue types are available in your project
node -e "
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const jiraApi = axios.create({
  baseURL: \`\${process.env.JIRA_BASE_URL}/rest/api/3\`,
  auth: { username: process.env.JIRA_EMAIL, password: process.env.JIRA_API_TOKEN }
});

jiraApi.get('/project').then(res => {
  const project = res.data[0];
  console.log('Project Key:', project.key);
  return jiraApi.get(\`/project/\${project.key}\`);
}).then(res => {
  console.log('Available Issue Types:');
  res.data.issueTypes.forEach(type => console.log('- ', type.name));
}).catch(console.error);
"
```

### Option C: Simplified Test Data Script
Create a simpler version that only creates basic tasks:

```bash
cd ~/jira-dashboard

# Create simple test ticket
node -e "
const axios = require('axios');
require('dotenv').config({ path: './backend/.env' });

const jiraApi = axios.create({
  baseURL: \`\${process.env.JIRA_BASE_URL}/rest/api/3\`,
  auth: { username: process.env.JIRA_EMAIL, password: process.env.JIRA_API_TOKEN }
});

async function createSimpleTicket() {
  try {
    const projects = await jiraApi.get('/project');
    const projectKey = projects.data[0].key;
    
    const issue = {
      fields: {
        project: { key: projectKey },
        summary: 'Test Dashboard Connection',
        description: {
          type: 'doc', version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Test ticket for dashboard' }] }]
        },
        issuetype: { name: 'Task' }
      }
    };
    
    const result = await jiraApi.post('/issue', issue);
    console.log('✅ Created test ticket:', result.data.key);
  } catch(error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}
createSimpleTicket();
"
```

---

## 🏥 System Health Checks

### Check Backend Status
```bash
pm2 status
pm2 logs jira-dashboard-backend --lines 50
```

### Check Frontend Status  
```bash
pm2 logs jira-dashboard-frontend --lines 20
curl http://localhost:3000
```

### Check Network Connectivity
```bash
# Get VM IP
ip addr show

# Test internal connectivity
curl http://localhost:3001/health
curl http://localhost:3000

# Test external access from Windows host
# Replace VM_IP with your actual VM IP
curl http://VM_IP:3001/health
curl http://VM_IP:3000
```

### Check Firewall
```bash
sudo ufw status
sudo ufw allow 3000
sudo ufw allow 3001
```

---

## 🎉 Expected Working State

After these fixes:

✅ **Backend Health**: `curl http://VM_IP:3001/health` returns JSON status  
✅ **Frontend**: `http://VM_IP:3000` shows React login screen  
✅ **Login**: Can login with admin/ChangeMe123!  
✅ **Dashboard**: Shows your Jira tickets after login  
✅ **Comments**: Adding comments works  

---

## 🔄 Alternative: Quick Demo Mode

If you want to bypass all the enterprise security for quick testing:

### Create Minimal Backend Configuration
```bash
cd ~/jira-dashboard/backend
cat > .env << 'EOF'
JIRA_BASE_URL=https://yourname-test.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your-api-token-here
PORT=3001
CORS_ORIGIN=http://YOUR_WINDOWS_IP:3000
NODE_ENV=development
PHI_DETECTION_ENABLED=false
SESSION_TIMEOUT=86400000
JWT_SECRET=demo-secret-123
SESSION_SECRET=demo-session-123
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin
EOF
```

### Test Sequence
```bash
# Restart services
pm2 restart all
sleep 5

# Test health
curl http://localhost:3001/health

# Test login  
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  -c cookies.txt

# Test API with session
curl -b cookies.txt http://localhost:3001/api/jira/user
```

---

## 🚨 Common Fixes for Remaining Issues

### If Backend Won't Start:
```bash
cd ~/jira-dashboard/backend
node scripts/start.js
# Look for specific error messages
```

### If Frontend Shows Blank Page:
```bash
# Check if built correctly
ls -la ~/jira-dashboard/build/
# Rebuild if needed
cd ~/jira-dashboard && npm run build
pm2 restart jira-dashboard-frontend
```

### If Can't Access from Windows:
```bash
# Check VM network adapter settings in VMware
# Ensure it's set to NAT or Bridged, not Host-only
sudo ufw status
sudo ufw allow from 192.168.0.0/16
```

### If Login Fails:
```bash
# Check backend logs for auth errors
pm2 logs jira-dashboard-backend | grep -i auth
# Verify default admin account is created
```

---

## 📞 Still Having Issues?

Run this diagnostic command on the VM:
```bash
echo "=== DIAGNOSTIC REPORT ==="
echo "VM IP: $(ip route get 8.8.8.8 | sed -n '/src/{s/.*src *\([^ ]*\).*/\1/p;q}')"
echo "Backend Status: $(curl -s http://localhost:3001/health | head -c 50)"
echo "PM2 Status:"
pm2 status
echo "Environment Check:"
ls -la ~/jira-dashboard/backend/.env ~/jira-dashboard/.env
echo "Port Check:"
sudo netstat -tlnp | grep -E ":(3000|3001)"
```

**The key insight**: This is an enterprise-grade secure application, not a simple demo. You need to authenticate first, then access the Jira endpoints. The test data failures are secondary - focus on getting the authentication and basic dashboard working first!
