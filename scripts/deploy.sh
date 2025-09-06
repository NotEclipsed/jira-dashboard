#!/bin/bash

# Jira Dashboard Deployment Script
# This script handles git-based deployment while preserving environment variables

set -e  # Exit on any error

DEPLOY_DIR="/opt/jira-dashboard"
BACKUP_DIR="/opt/jira-dashboard-backup"
REPO_URL="https://github.com/NotEclipsed/jira-dashboard.git"
BRANCH="master"

echo "🚀 Starting Jira Dashboard Deployment"
echo "=================================="

# Function to backup environment files
backup_env_files() {
    echo "📦 Backing up environment files..."
    
    if [ -f "$DEPLOY_DIR/backend/.env" ]; then
        cp "$DEPLOY_DIR/backend/.env" "/tmp/backend_env_backup"
        echo "✅ Backend .env backed up"
    else
        echo "⚠️  No backend .env file found to backup"
    fi
    
    if [ -f "$DEPLOY_DIR/.env" ]; then
        cp "$DEPLOY_DIR/.env" "/tmp/frontend_env_backup"
        echo "✅ Frontend .env backed up"
    else
        echo "⚠️  No frontend .env file found to backup"
    fi
}

# Function to restore environment files
restore_env_files() {
    echo "📁 Restoring environment files..."
    
    if [ -f "/tmp/backend_env_backup" ]; then
        cp "/tmp/backend_env_backup" "$DEPLOY_DIR/backend/.env"
        echo "✅ Backend .env restored"
        rm "/tmp/backend_env_backup"
    fi
    
    if [ -f "/tmp/frontend_env_backup" ]; then
        cp "/tmp/frontend_env_backup" "$DEPLOY_DIR/.env"
        echo "✅ Frontend .env restored"
        rm "/tmp/frontend_env_backup"
    fi
}

# Function to stop services
stop_services() {
    echo "🛑 Stopping services..."
    
    if pm2 describe jira-dashboard-backend > /dev/null 2>&1; then
        pm2 stop jira-dashboard-backend
        echo "✅ Backend stopped"
    fi
    
    if pm2 describe jira-dashboard-frontend > /dev/null 2>&1; then
        pm2 stop jira-dashboard-frontend
        echo "✅ Frontend stopped"
    fi
}

# Function to start services
start_services() {
    echo "🚀 Starting services..."
    
    cd "$DEPLOY_DIR"
    
    # Start backend
    pm2 start ecosystem.config.js
    echo "✅ Services started with PM2"
    
    # Show status
    pm2 list
}

# Check if this is first deployment
if [ ! -d "$DEPLOY_DIR" ]; then
    echo "📥 First deployment - cloning repository..."
    git clone "$REPO_URL" "$DEPLOY_DIR"
    cd "$DEPLOY_DIR"
    git checkout "$BRANCH"
    
    echo "📦 Installing dependencies..."
    npm install
    cd backend && npm install && cd ..
    
    echo "⚠️  IMPORTANT: Please configure environment files before starting services!"
    echo "   Backend: $DEPLOY_DIR/backend/.env"
    echo "   Frontend: $DEPLOY_DIR/.env"
    echo ""
    echo "   Then run: pm2 start ecosystem.config.js"
    exit 0
fi

# Backup environment files
backup_env_files

# Stop services
stop_services

# Create full backup of current deployment
echo "📦 Creating backup of current deployment..."
rm -rf "$BACKUP_DIR"
cp -r "$DEPLOY_DIR" "$BACKUP_DIR"
echo "✅ Backup created at $BACKUP_DIR"

# Update code
echo "📥 Updating code from git..."
cd "$DEPLOY_DIR"
git fetch origin
git reset --hard "origin/$BRANCH"
echo "✅ Code updated"

# Restore environment files
restore_env_files

# Install/update dependencies
echo "📦 Updating dependencies..."
npm install
cd backend && npm install && cd ..
echo "✅ Dependencies updated"

# Build frontend
echo "🔨 Building frontend..."
npm run build
echo "✅ Frontend built"

# Start services
start_services

echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================="
echo "📊 Application should be available at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:3001"
echo ""
echo "📝 Check logs with: pm2 logs"
echo "📈 Check status with: pm2 list"
echo ""
echo "🔄 To rollback if needed:"
echo "   pm2 stop all"
echo "   rm -rf $DEPLOY_DIR"
echo "   mv $BACKUP_DIR $DEPLOY_DIR"
echo "   pm2 start $DEPLOY_DIR/ecosystem.config.js"
