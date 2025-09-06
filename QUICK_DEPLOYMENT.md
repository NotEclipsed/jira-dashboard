# 🚀 Quick Deployment Guide

**This guide gets you from zero to a working, secure Jira Dashboard in under 30 minutes!**

## 📋 What You'll Need

- VMware Workstation Pro
- About 30 minutes
- Jira Cloud account (free)

---

## 🎯 Step 1: Set Up Jira Cloud (5 minutes)

1. **Go to**: [https://www.atlassian.com/try](https://www.atlassian.com/try)
2. **Sign up** for free Jira Software
3. **Choose site name**: `yourname-test` (becomes `yourname-test.atlassian.net`)
4. **Create project**: Use Scrum template, name it "Test Dashboard"
5. **Generate API token**:
   - Go to [API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
   - Create token labeled "Dashboard Test"
   - **SAVE THE TOKEN** - you won't see it again!

**You now have**: 
- Jira URL: `https://yourname-test.atlassian.net`
- Your email
- API token

---

## 🖥️ Step 2: Create VM (10 minutes)

1. **Download**: [Ubuntu Server 22.04 LTS ISO](https://ubuntu.com/download/server)
2. **VMware**: Create New VM → Typical → Use ISO
3. **Settings**:
   - Name: `Ubuntu-JiraDashboard`  
   - User: `jira_admin`
   - Memory: `4GB`
   - Disk: `40GB`
   - Network: `NAT`
4. **Install Ubuntu** (auto-installs, select SSH server)
5. **First boot**: Login and run:
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl wget git vim htop ufw
   ```

---

## 🔧 Step 3: Install Node.js (3 minutes)

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2 serve

# Verify
node --version  # Should show v18.x.x
```

---

## 📁 Step 4: Transfer Files (2 minutes)

**Option A** - SCP from Windows (get VM IP first with `ip addr show`):
```powershell
# From Windows PowerShell
scp -r C:\Users\jrhyd\jira-dashboard jira_admin@VM_IP:/home/jira_admin/
```

**Option B** - Git (if you have it in a repo):
```bash
cd ~
git clone https://your-repo-url.git jira-dashboard
```

**Option C** - VMware Shared Folders (see VM_SETUP_GUIDE.md)

---

## ⚙️ Step 5: Configure & Start (5 minutes)

```bash
cd ~/jira-dashboard

# Install all dependencies
npm run install-all

# Configure backend
cd backend
cp .env.example .env
vim .env
```

**Edit `.env` with your Jira details**:
```env
JIRA_BASE_URL=https://yourname-test.atlassian.net
JIRA_EMAIL=your-email@domain.com
JIRA_API_TOKEN=your-api-token-here
PORT=3001
CORS_ORIGIN=http://192.168.xxx.xxx:3000
```

```bash
# Configure frontend
cd ..
cp .env.example .env
vim .env
```

**Edit `.env`**:
```env
REACT_APP_BACKEND_URL=http://192.168.xxx.xxx:3001
```

---

## 🧪 Step 6: Test Connection (2 minutes)

```bash
# Test Jira connection
npm run test-connection

# If successful, create sample data
npm run setup-test-data

# Build frontend
npm run build

# Start both services
mkdir logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow the instructions
```

---

## 🌐 Step 7: Access Dashboard (1 minute)

1. **Get VM IP**: `ip addr show`
2. **Open browser** on Windows host
3. **Navigate to**: `http://VM_IP:3000`

**You should see**:
- Welcome message with your name
- Dashboard with statistics
- Your assigned/created tickets
- Working search and filters

---

## 🎉 Success Checklist

- [ ] VM running Ubuntu
- [ ] Node.js installed
- [ ] Jira connection tested
- [ ] Sample data created
- [ ] Backend running on port 3001
- [ ] Frontend running on port 3000
- [ ] Dashboard accessible from host
- [ ] Can view tickets
- [ ] Can add comments
- [ ] Search/filter working

---

## 🚨 Quick Troubleshooting

**Can't connect to Jira**:
```bash
# Check config
npm run test-connection
```

**Backend won't start**:
```bash
# Check logs
pm2 logs jira-dashboard-backend
```

**Can't access from host**:
```bash
# Check firewall
sudo ufw allow 3000
sudo ufw allow 3001
```

**Dashboard loads but no data**:
- Verify environment variables match
- Check backend logs: `pm2 logs`
- Test backend: `curl http://localhost:3001/health`

---

## 🔄 Management Commands

```bash
# Check status
pm2 status

# View logs
pm2 logs

# Restart services
pm2 restart all

# Stop services
pm2 stop all

# Check VM resources
htop
```

---

## 🎯 What You Accomplished

✅ **Security Issues Fixed**:
- No more API tokens in client-side code
- JQL injection prevention
- Input validation and sanitization
- Proper error handling
- Rate limiting and security headers

✅ **Infrastructure Setup**:
- Isolated VM environment
- Secure backend proxy
- Production-ready deployment
- Process management with PM2

✅ **Testing Environment**:
- Free Jira Cloud instance
- Sample test data
- Realistic ticket scenarios

---

**🎉 Your secure Jira Dashboard is now running! Test all features and enjoy the improved security.**
