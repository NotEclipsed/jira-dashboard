# Server Deployment Guide

This guide walks you through setting up a git-based deployment workflow for the Jira Dashboard that preserves your API keys and environment configuration.

## 🎯 Overview

- **Clean git-based deployments** that preserve environment files
- **Zero-downtime updates** with PM2 process management
- **Automatic backups** before each deployment
- **Easy rollback** if something goes wrong

## 📋 Prerequisites

### On Your Development Machine
- Git configured and connected to your repository
- SSH access to your server

### On Your Server  
- **Ubuntu 20.04+** (or similar Linux distribution)
- **Node.js 18+** installed
- **PM2** process manager installed
- **Git** installed
- **Nginx** (optional, for reverse proxy)

## 🚀 Initial Server Setup

### 1. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Git (if not already installed)
sudo apt install git -y

# Verify installations
node --version
npm --version
pm2 --version
git --version
```

### 2. Create Deployment User (Recommended)

```bash
# Create dedicated user for the application
sudo useradd -m -s /bin/bash jira-app
sudo usermod -aG sudo jira-app

# Switch to the application user
sudo su - jira-app
```

### 3. Set up SSH Keys (if using private repository)

```bash
# Generate SSH key for git access
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Add the public key to your Git provider (GitHub/GitLab)
cat ~/.ssh/id_rsa.pub
```

## 📦 First-Time Deployment

### 1. Update Repository URL

First, update the deployment script with your actual repository URL:

```bash
# Edit scripts/deploy.sh and update:
REPO_URL="https://github.com/YOUR-USERNAME/jira-dashboard.git"
```

### 2. Push Code to Repository

On your development machine:

```bash
# Make sure all changes are committed
git add -A
git commit -m "feat: ready for server deployment"
git push origin master
```

### 3. Run Initial Deployment

On your server:

```bash
# Download and run the deployment script
curl -o deploy.sh https://raw.githubusercontent.com/YOUR-USERNAME/jira-dashboard/master/scripts/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

This will:
- Clone the repository to `/opt/jira-dashboard`
- Install all dependencies
- Create the directory structure
- **Stop and wait for you to configure environment files**

### 4. Configure Environment Files

The deployment will pause and ask you to configure:

#### Backend Environment (`/opt/jira-dashboard/backend/.env`):
```bash
sudo nano /opt/jira-dashboard/backend/.env
```

```env
# Jira Configuration (KEEP YOUR EXISTING VALUES)
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token-here

# Server Configuration
PORT=3001
NODE_ENV=production

# Security (generate secure random values)
JWT_SECRET=your-super-secure-jwt-secret-here-at-least-32-chars
SESSION_TIMEOUT=900000
MAX_SESSION_TIMEOUT=3600000

# Default Admin User (change the password!)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@yourcompany.com
DEFAULT_ADMIN_PASSWORD=YourSecurePassword123!

# Optional: Azure AD Integration
AZURE_AD_ENABLED=false
# AZURE_AD_TENANT_ID=your-tenant-id
# AZURE_AD_CLIENT_ID=your-client-id
# AZURE_AD_CLIENT_SECRET=your-client-secret
```

#### Frontend Environment (`/opt/jira-dashboard/.env`):
```bash
sudo nano /opt/jira-dashboard/.env
```

```env
# Backend API URL
REACT_APP_BACKEND_URL=http://localhost:3001

# Build configuration
GENERATE_SOURCEMAP=false
```

### 5. Start Services

```bash
cd /opt/jira-dashboard
sudo pm2 start ecosystem.config.js
```

### 6. Set up PM2 to Start on Boot

```bash
# Save PM2 process list
sudo pm2 save

# Generate startup script
sudo pm2 startup

# Follow the instructions PM2 gives you (usually running a sudo command)
```

### 7. Configure Nginx (Optional but Recommended)

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/jira-dashboard
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    # Frontend (React build)
    location / {
        root /opt/jira-dashboard/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /auth {
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

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/jira-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔄 Updating the Application

For all future updates, simply run the deployment script:

```bash
cd /path/to/your/script
sudo ./deploy.sh
```

This will:
1. ✅ **Backup your environment files** (preserves API keys)
2. ✅ **Stop services gracefully**  
3. ✅ **Create full backup** of current deployment
4. ✅ **Pull latest code** from git
5. ✅ **Restore environment files**
6. ✅ **Update dependencies**
7. ✅ **Build frontend**
8. ✅ **Restart services**

## 🛠 Management Commands

### Check Status
```bash
pm2 list
pm2 logs
pm2 monit
```

### Manual Service Control
```bash
# Stop services
pm2 stop jira-dashboard-backend
pm2 stop jira-dashboard-frontend

# Start services
pm2 start ecosystem.config.js

# Restart services
pm2 restart all
```

### View Logs
```bash
# All logs
pm2 logs

# Specific service logs
pm2 logs jira-dashboard-backend
pm2 logs jira-dashboard-frontend

# Follow logs in real-time
pm2 logs --lines 100
```

## 🚨 Troubleshooting

### Services Won't Start
```bash
# Check PM2 logs
pm2 logs

# Check if ports are in use
sudo netstat -tlnp | grep :3001
sudo netstat -tlnp | grep :3000

# Check environment files exist
ls -la /opt/jira-dashboard/backend/.env
ls -la /opt/jira-dashboard/.env
```

### Authentication Issues
```bash
# Check backend logs
pm2 logs jira-dashboard-backend

# Verify Jira API token
curl -u "your-email@company.com:your-api-token" \
  "https://your-domain.atlassian.net/rest/api/3/myself"
```

### Database Issues
```bash
# Check if user data directory exists
ls -la /opt/jira-dashboard/backend/data/

# Reset admin user (if needed)
rm /opt/jira-dashboard/backend/data/users.json
pm2 restart jira-dashboard-backend
```

## 🔙 Rollback Procedure

If something goes wrong during deployment:

```bash
# Stop current services
pm2 stop all

# Restore from backup
sudo rm -rf /opt/jira-dashboard
sudo mv /opt/jira-dashboard-backup /opt/jira-dashboard

# Start services
cd /opt/jira-dashboard
pm2 start ecosystem.config.js
```

## 🔐 Security Considerations

### File Permissions
```bash
# Set proper ownership
sudo chown -R jira-app:jira-app /opt/jira-dashboard

# Secure environment files
sudo chmod 600 /opt/jira-dashboard/backend/.env
sudo chmod 600 /opt/jira-dashboard/.env
```

### Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### SSL/HTTPS Setup (Recommended)
Use Let's Encrypt with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 📊 Monitoring

### Set up Log Rotation
```bash
# PM2 handles log rotation automatically, but you can configure:
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Health Check Endpoint
The backend provides a health check at:
- `GET http://localhost:3001/health`

### Performance Monitoring
```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
```

## 🎉 Success!

Your Jira Dashboard should now be running at:
- **Frontend**: `http://your-server-ip:3000` (or your domain if using Nginx)
- **Backend API**: `http://your-server-ip:3001`

**Default login credentials:**
- Username: `admin`
- Password: `YourSecurePassword123!` (or whatever you set)

**Remember to change the default password after first login!**
