# 🖥️ VMware Workstation Pro - Ubuntu VM Setup Guide

Complete guide for setting up an Ubuntu VM to host the secure Jira Dashboard application.

## 📋 Prerequisites

- VMware Workstation Pro installed on your Windows host
- At least 8GB RAM available for the VM
- At least 40GB free disk space
- Internet connection for downloading Ubuntu and packages

## 🚀 Part 1: Creating the Ubuntu VM

### Step 1: Download Ubuntu Server ISO
1. Visit [Ubuntu Server Download](https://ubuntu.com/download/server)
2. Download **Ubuntu Server 22.04 LTS** (recommended for stability)
3. Save the ISO file to your local machine

### Step 2: Create New Virtual Machine
1. **Open VMware Workstation Pro**
2. Click **"Create a New Virtual Machine"**
3. Choose **"Typical (recommended)"**
4. Select **"Installer disc image file (iso)"** and browse to your Ubuntu ISO
5. **Easy Install Information**:
   - Full name: `Ubuntu Admin`
   - User name: `ubuntu`
   - Password: `YourSecurePassword123!` (use a strong password)
   - Confirm password

### Step 3: Virtual Machine Configuration
1. **Virtual Machine Name**: `Ubuntu-JiraDashboard`
2. **Location**: Choose appropriate location (default is fine)
3. **Disk Capacity**: 
   - Maximum disk size: `40 GB`
   - ✅ Store virtual disk as a single file
4. **Customize Hardware**:
   - **Memory**: `4096 MB` (4GB minimum, 8GB recommended)
   - **Processors**: `2` cores
   - **Network Adapter**: `NAT` (for internet access)
   - **CD/DVD**: Ensure it points to Ubuntu ISO
5. Click **"Finish"**

### Step 4: Install Ubuntu
1. **Power on** the virtual machine
2. Ubuntu installer will start automatically
3. **Installation Options**:
   - Language: `English`
   - Keyboard layout: `English (US)` or your preference
   - Installation type: `Install Ubuntu Server`
   - Network: Leave default (DHCP)
   - Proxy: Leave blank
   - Mirror: Leave default
4. **Storage Layout**:
   - Use entire disk: ✅ Yes
   - Set up this disk as an LVM group: ✅ Yes
5. **Profile Setup**:
   - Your name: `Ubuntu Admin`
   - Your server's name: `jira-dashboard`
   - Username: `ubuntu`
   - Password: Your secure password
6. **SSH Setup**:
   - ✅ Install OpenSSH server (recommended)
   - Import SSH identity: No
7. **Featured Server Snaps**:
   - ✅ docker (we'll use this)
   - Leave others unchecked for now
8. **Installation**: Wait for completion (10-15 minutes)
9. **Restart** when prompted

### Step 5: First Boot and Updates
1. **Login** with your ubuntu user credentials
2. **Update the system**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```
3. **Install essential tools**:
   ```bash
   sudo apt install -y curl wget git vim htop ufw
   ```

## 🔧 Part 2: System Configuration

### Step 1: Configure Firewall
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH (port 22)
sudo ufw allow ssh

# Allow HTTP (port 80) and HTTPS (port 443)
sudo ufw allow 80
sudo ufw allow 443

# Allow our application ports
sudo ufw allow 3000  # React frontend
sudo ufw allow 3001  # Backend API

# Check status
sudo ufw status verbose
```

### Step 2: Install Node.js and npm
```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher

# Install PM2 for process management
sudo npm install -g pm2
```

### Step 3: Create Application User
```bash
# Create a dedicated user for the application
sudo adduser jira-dashboard

# Add to sudo group if needed
sudo usermod -aG sudo jira-dashboard

# Switch to the new user
sudo su - jira-dashboard
```

### Step 4: Set up Application Directory
```bash
# Create application directory
mkdir -p ~/apps
cd ~/apps

# You'll transfer your application files here later
```

## 📁 Part 3: Transfer Application Files

### Option A: Using Git (Recommended)
If you have the code in a Git repository:
```bash
cd ~/apps
git clone https://your-repo-url.git jira-dashboard
cd jira-dashboard
```

### Option B: Using SCP from Windows Host
From your Windows machine (PowerShell):
```powershell
# Get VM IP address first (run this on VM):
# ip addr show

# Transfer files (replace VM_IP with actual IP)
scp -r C:\Users\jrhyd\jira-dashboard ubuntu@VM_IP:/home/ubuntu/apps/
```

### Option C: Using Shared Folder
1. **In VMware**:
   - VM → Settings → Options → Shared Folders
   - Enable shared folders
   - Add folder: `C:\Users\jrhyd\jira-dashboard`
2. **On VM**:
   ```bash
   sudo apt install open-vm-tools-desktop
   sudo reboot
   # After reboot, access via /mnt/hgfs/
   ```

## 🏗️ Part 4: Application Setup

### Step 1: Install Backend Dependencies
```bash
cd ~/apps/jira-dashboard/backend
npm install
```

### Step 2: Install Frontend Dependencies
```bash
cd ~/apps/jira-dashboard
npm install
```

### Step 3: Configure Environment Variables
```bash
# Backend configuration
cd ~/apps/jira-dashboard/backend
cp .env.example .env
vim .env

# Edit .env with your test Jira details:
# JIRA_BASE_URL=https://your-test-domain.atlassian.net
# JIRA_EMAIL=your-test-email@company.com
# JIRA_API_TOKEN=your-test-api-token
# PORT=3001
# CORS_ORIGIN=http://VM_IP:3000
```

```bash
# Frontend configuration
cd ~/apps/jira-dashboard
cp .env.example .env
vim .env

# Edit .env:
# REACT_APP_BACKEND_URL=http://VM_IP:3001
```

### Step 4: Build Frontend for Production
```bash
cd ~/apps/jira-dashboard
npm run build
```

## 🚀 Part 5: Deploy with PM2

### Step 1: Create PM2 Configuration
```bash
cd ~/apps/jira-dashboard
vim ecosystem.config.js
```

Add this configuration:
```javascript
module.exports = {
  apps: [
    {
      name: 'jira-dashboard-backend',
      cwd: './backend',
      script: 'scripts/start.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log'
    },
    {
      name: 'jira-dashboard-frontend',
      script: 'serve',
      args: '-s build -l 3000',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log'
    }
  ]
};
```

### Step 2: Install Serve for Frontend
```bash
sudo npm install -g serve
```

### Step 3: Create Log Directory
```bash
cd ~/apps/jira-dashboard
mkdir -p logs
```

### Step 4: Start Applications
```bash
# Start both applications
pm2 start ecosystem.config.js

# Check status
pm2 status

# View logs
pm2 logs

# Make PM2 start on boot
pm2 startup
# Follow the instructions provided by this command
pm2 save
```

## 🔧 Part 6: Nginx Reverse Proxy (Optional but Recommended)

### Step 1: Install Nginx
```bash
sudo apt install nginx
```

### Step 2: Configure Nginx
```bash
sudo vim /etc/nginx/sites-available/jira-dashboard
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-vm-ip;  # Replace with actual VM IP

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Step 3: Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/jira-dashboard /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
sudo systemctl enable nginx
```

## 🌐 Part 7: Network Access from Host

### Step 1: Get VM IP Address
```bash
ip addr show
# Look for the IP address (usually 192.168.x.x)
```

### Step 2: Test Access
From your Windows host browser:
- **Frontend**: `http://VM_IP` (if using Nginx) or `http://VM_IP:3000`
- **Backend Health**: `http://VM_IP/api/jira/health` or `http://VM_IP:3001/health`

### Step 3: Windows Hosts File (Optional)
Add to `C:\Windows\System32\drivers\etc\hosts`:
```
VM_IP    jira-dashboard.local
```
Then access via `http://jira-dashboard.local`

## 📊 Part 8: Monitoring and Maintenance

### Useful Commands
```bash
# Check application status
pm2 status

# View logs
pm2 logs jira-dashboard-backend
pm2 logs jira-dashboard-frontend

# Restart applications
pm2 restart all

# Stop applications
pm2 stop all

# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check network connections
netstat -tlnp
```

### Backup Script
```bash
#!/bin/bash
# Create backup script
mkdir -p ~/backups
cd ~/apps
tar -czf ~/backups/jira-dashboard-$(date +%Y%m%d-%H%M%S).tar.gz jira-dashboard/
# Keep only last 5 backups
ls -t ~/backups/jira-dashboard-*.tar.gz | tail -n +6 | xargs rm -f
```

## 🚨 Troubleshooting

### Common Issues

1. **VM won't boot**:
   - Check VM settings in VMware
   - Verify ISO file integrity
   - Increase memory allocation

2. **Network connectivity issues**:
   - Try NAT instead of Bridged networking
   - Check firewall settings with `sudo ufw status`
   - Verify VMware network settings

3. **Application won't start**:
   - Check logs: `pm2 logs`
   - Verify environment variables
   - Check port availability: `netstat -tlnp | grep :3001`

4. **Can't access from host**:
   - Verify VM IP: `ip addr show`
   - Check firewall: `sudo ufw status`
   - Test with curl: `curl http://localhost:3001/health`

### Log Locations
- Application logs: `~/apps/jira-dashboard/logs/`
- System logs: `/var/log/`
- Nginx logs: `/var/log/nginx/`

## ✅ Verification Checklist

- [ ] VM boots successfully
- [ ] Ubuntu is updated and configured
- [ ] Node.js and npm installed
- [ ] Application files transferred
- [ ] Environment variables configured
- [ ] Backend starts without errors
- [ ] Frontend builds and serves
- [ ] PM2 manages processes
- [ ] Applications accessible from host
- [ ] Nginx proxy working (if configured)
- [ ] Firewall properly configured

---

**Next Steps**: After completing this setup, proceed to the Jira Cloud setup guide to create your test environment.
