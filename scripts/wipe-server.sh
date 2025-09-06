#!/bin/bash

# Complete Server Wipe Script for Jira Dashboard
# Use this to completely remove all traces of the application for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${RED}🧨 COMPLETE SERVER WIPE FOR JIRA DASHBOARD${NC}"
echo "============================================="
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will completely remove:${NC}"
echo "   - All PM2 processes related to jira-dashboard"
echo "   - Application directory (/opt/jira-dashboard)"
echo "   - All application data and configuration files"
echo "   - PM2 startup configuration"
echo ""
echo -e "${YELLOW}⚠️  This will NOT remove:${NC}"
echo "   - Node.js installation"
echo "   - PM2 installation (just processes)"
echo "   - System packages"
echo ""

# Ask for confirmation
read -p "Are you absolutely sure you want to proceed? (type 'WIPE' to confirm): " confirm
if [ "$confirm" != "WIPE" ]; then
    echo -e "${GREEN}❌ Wipe cancelled - no changes made${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}🛑 Stopping and removing PM2 processes...${NC}"

# Stop and delete all jira-dashboard related PM2 processes
pm2 delete jira-dashboard-backend 2>/dev/null || echo "   Backend process not found"
pm2 delete jira-dashboard-frontend 2>/dev/null || echo "   Frontend process not found"

# Also try common variants
pm2 delete jira-backend 2>/dev/null || true
pm2 delete jira-frontend 2>/dev/null || true
pm2 delete "jira dashboard" 2>/dev/null || true

# Save PM2 configuration without these processes
pm2 save

echo -e "${GREEN}✅ PM2 processes cleaned${NC}"

echo ""
echo -e "${BLUE}🗑️  Removing application directory...${NC}"

# Remove the main application directory
sudo rm -rf /opt/jira-dashboard

# Also remove any backup directories
sudo rm -rf /opt/jira-dashboard-backup
sudo rm -rf /opt/jira-dashboard-env-backup

echo -e "${GREEN}✅ Application directory removed${NC}"

echo ""
echo -e "${BLUE}🧹 Cleaning temporary files...${NC}"

# Remove any temporary files
rm -f /tmp/backend_env_backup
rm -f /tmp/frontend_env_backup
rm -f /tmp/master.zip
rm -rf /tmp/jira-dashboard*

# Clean up any downloaded scripts
rm -f ~/deploy.sh
rm -f ~/auto-setup.sh
rm -f ~/cleanup-server.sh
rm -f ./deploy.sh
rm -f ./auto-setup.sh
rm -f ./cleanup-server.sh

echo -e "${GREEN}✅ Temporary files cleaned${NC}"

echo ""
echo -e "${BLUE}🔄 Checking PM2 status...${NC}"

# Show current PM2 status
pm2 list

echo ""
echo -e "${BLUE}📊 Checking for remaining files...${NC}"

# Check if anything is left
if [ -d "/opt/jira-dashboard" ]; then
    echo -e "${RED}❌ /opt/jira-dashboard still exists${NC}"
else
    echo -e "${GREEN}✅ /opt/jira-dashboard removed${NC}"
fi

# Check for any remaining jira processes
if pm2 list | grep -i jira > /dev/null; then
    echo -e "${RED}❌ Some jira processes still running${NC}"
    pm2 list | grep -i jira
else
    echo -e "${GREEN}✅ No jira processes found${NC}"
fi

echo ""
echo -e "${GREEN}🎉 SERVER WIPE COMPLETED!${NC}"
echo "========================"
echo ""
echo -e "${BLUE}📋 Summary of what was removed:${NC}"
echo "   ✅ All jira-dashboard PM2 processes"
echo "   ✅ Application directory (/opt/jira-dashboard)"
echo "   ✅ All configuration files and data"
echo "   ✅ Temporary and backup files"
echo "   ✅ Downloaded deployment scripts"
echo ""
echo -e "${BLUE}🚀 Server is now clean and ready for fresh installation!${NC}"
echo ""
echo -e "${YELLOW}💡 To install fresh, run:${NC}"
echo "   curl -s https://raw.githubusercontent.com/NotEclipsed/jira-dashboard/master/scripts/auto-setup.sh | bash"
echo ""
echo -e "${BLUE}🔍 To verify clean state:${NC}"
echo "   pm2 list                  # Should show no jira processes"
echo "   ls -la /opt/              # Should not show jira-dashboard"
echo "   curl localhost:3000       # Should fail to connect"
echo "   curl localhost:3001       # Should fail to connect"
