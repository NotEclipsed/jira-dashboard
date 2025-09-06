#!/bin/bash

# Jira Dashboard Server Cleanup Script
# Use this to cleanly remove the current deployment and start fresh

set -e

DEPLOY_DIR="/opt/jira-dashboard"
BACKUP_DIR="/opt/jira-dashboard-env-backup"

echo "🧹 Jira Dashboard Server Cleanup"
echo "================================="
echo ""
echo "⚠️  WARNING: This will:"
echo "   - Stop all PM2 processes for jira-dashboard"
echo "   - Backup environment files to $BACKUP_DIR"
echo "   - Remove the application directory $DEPLOY_DIR"
echo "   - Clear PM2 process list"
echo ""
echo "Your Jira API tokens and environment config will be backed up."
echo ""

# Ask for confirmation
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 1
fi

echo ""
echo "🛑 Stopping PM2 processes..."

# Stop specific jira-dashboard processes
if pm2 describe jira-dashboard-backend > /dev/null 2>&1; then
    pm2 stop jira-dashboard-backend
    pm2 delete jira-dashboard-backend
    echo "✅ Backend process stopped and removed"
fi

if pm2 describe jira-dashboard-frontend > /dev/null 2>&1; then
    pm2 stop jira-dashboard-frontend  
    pm2 delete jira-dashboard-frontend
    echo "✅ Frontend process stopped and removed"
fi

# Save PM2 process list (without jira-dashboard processes)
pm2 save --force

echo ""
echo "📦 Backing up environment files..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup environment files if they exist
if [ -f "$DEPLOY_DIR/backend/.env" ]; then
    cp "$DEPLOY_DIR/backend/.env" "$BACKUP_DIR/backend.env"
    echo "✅ Backend .env backed up to $BACKUP_DIR/backend.env"
fi

if [ -f "$DEPLOY_DIR/.env" ]; then
    cp "$DEPLOY_DIR/.env" "$BACKUP_DIR/frontend.env"  
    echo "✅ Frontend .env backed up to $BACKUP_DIR/frontend.env"
fi

# Backup user data if it exists
if [ -d "$DEPLOY_DIR/backend/data" ]; then
    cp -r "$DEPLOY_DIR/backend/data" "$BACKUP_DIR/"
    echo "✅ User data backed up to $BACKUP_DIR/data"
fi

echo ""
echo "🗑️  Removing application directory..."

if [ -d "$DEPLOY_DIR" ]; then
    rm -rf "$DEPLOY_DIR"
    echo "✅ Application directory removed"
else
    echo "ℹ️  Application directory doesn't exist"
fi

echo ""
echo "🧹 Additional cleanup..."

# Remove any temporary files
rm -f /tmp/backend_env_backup
rm -f /tmp/frontend_env_backup

# Show current PM2 status
echo ""
echo "📊 Current PM2 processes:"
pm2 list

echo ""
echo "🎉 Cleanup completed!"
echo "==================="
echo ""
echo "📋 What was done:"
echo "   ✅ PM2 jira-dashboard processes stopped and removed"
echo "   ✅ Environment files backed up to: $BACKUP_DIR"
echo "   ✅ Application directory removed: $DEPLOY_DIR"
echo "   ✅ Temporary files cleaned up"
echo ""
echo "🚀 Next Steps:"
echo "   1. Run your deployment script to reinstall fresh"
echo "   2. Restore environment files from: $BACKUP_DIR"
echo "   3. Or configure new environment files"
echo ""
echo "💾 Environment Backup Location:"
echo "   Backend config: $BACKUP_DIR/backend.env"
echo "   Frontend config: $BACKUP_DIR/frontend.env"
echo "   User data: $BACKUP_DIR/data/"
echo ""
echo "🔄 To restore environment files after deployment:"
echo "   sudo cp $BACKUP_DIR/backend.env $DEPLOY_DIR/backend/.env"
echo "   sudo cp $BACKUP_DIR/frontend.env $DEPLOY_DIR/.env"
echo "   sudo cp -r $BACKUP_DIR/data $DEPLOY_DIR/backend/"
