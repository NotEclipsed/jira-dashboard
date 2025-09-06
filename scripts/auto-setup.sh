#!/bin/bash

# Jira Dashboard Automated Setup Script
# This script fully automates the deployment with minimal user input

# Removed set -e to handle errors gracefully

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DEPLOY_DIR="/opt/jira-dashboard"
REPO_URL="https://github.com/NotEclipsed/jira-dashboard.git"
BRANCH="master"

echo -e "${BLUE}🚀 Jira Dashboard Automated Setup${NC}"
echo "=================================="
echo ""

# Function to prompt for required info
get_user_config() {
    echo -e "${YELLOW}📝 Please provide your Jira configuration:${NC}"
    echo ""
    
    # Ensure we have a proper terminal for input
    exec < /dev/tty
    
    while [[ -z "$JIRA_BASE_URL" ]]; do
        read -p "Jira Base URL (e.g., https://company.atlassian.net): " JIRA_BASE_URL
        if [[ -z "$JIRA_BASE_URL" ]]; then
            echo -e "${RED}Please enter a valid Jira Base URL${NC}"
        fi
    done
    
    while [[ -z "$JIRA_EMAIL" ]]; do
        read -p "Your Jira Email: " JIRA_EMAIL
        if [[ -z "$JIRA_EMAIL" ]]; then
            echo -e "${RED}Please enter a valid email address${NC}"
        fi
    done
    
    while [[ -z "$JIRA_API_TOKEN" ]]; do
        echo -n "Your Jira API Token (input will be hidden): "
        read -s JIRA_API_TOKEN
        echo ""
        if [[ -z "$JIRA_API_TOKEN" ]]; then
            echo -e "${RED}Please enter your Jira API token${NC}"
        fi
    done
    
    echo ""
    
    # Generate secure JWT secret automatically
    if command -v openssl >/dev/null 2>&1; then
        JWT_SECRET=$(openssl rand -hex 32)
    else
        # Fallback if openssl is not available
        JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 64)
    fi
    
    echo -e "${GREEN}✅ Configuration collected successfully!${NC}"
    echo "   Jira URL: $JIRA_BASE_URL"
    echo "   Email: $JIRA_EMAIL"
    echo "   API Token: [HIDDEN]"
    echo ""
}

# Function to install system dependencies
install_dependencies() {
    echo -e "${BLUE}📦 Installing system dependencies...${NC}"
    
    # Install wget if not present
    if ! command -v wget &> /dev/null; then
        echo "Installing wget..."
        sudo apt update
        sudo apt install -y wget
    fi
    
    # Update system
    echo "Updating package lists..."
    sudo apt update
    
    # Install Node.js 18 if not installed
    if ! command -v node &> /dev/null; then
        echo "Installing Node.js 18..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        echo "Node.js version: $(node --version)"
    else
        echo "Node.js already installed: $(node --version)"
    fi
    
    # Install PM2 if not installed
    if ! command -v pm2 &> /dev/null; then
        echo "Installing PM2..."
        sudo npm install -g pm2
        echo "PM2 installed successfully"
    else
        echo "PM2 already installed"
    fi
    
    echo -e "${GREEN}✅ System dependencies installed${NC}"
}

# Function to download and setup application
setup_application() {
    echo -e "${BLUE}📥 Setting up application...${NC}"
    
    # Clean up any existing installation
    sudo rm -rf "$DEPLOY_DIR"
    
    # Download the latest release
    cd /tmp
    rm -f master.zip
    wget https://github.com/NotEclipsed/jira-dashboard/archive/refs/heads/master.zip
    unzip -q master.zip
    
    # Move to deployment directory
    sudo mv jira-dashboard-master "$DEPLOY_DIR"
    sudo chown -R $(whoami):$(whoami) "$DEPLOY_DIR"
    
    # Navigate to project
    cd "$DEPLOY_DIR"
    
    echo -e "${GREEN}✅ Application downloaded${NC}"
}

# Function to install npm dependencies
install_npm_dependencies() {
    echo -e "${BLUE}📦 Installing application dependencies...${NC}"
    
    cd "$DEPLOY_DIR"
    
    # Install frontend dependencies
    echo "Installing frontend dependencies..."
    npm install --production
    
    # Install backend dependencies  
    echo "Installing backend dependencies..."
    cd backend
    npm install --production
    cd ..
    
    echo -e "${GREEN}✅ Dependencies installed${NC}"
}

# Function to create configuration files
create_config_files() {
    echo -e "${BLUE}⚙️ Creating configuration files...${NC}"
    
    # Create backend .env file
    cat > "$DEPLOY_DIR/backend/.env" << EOF
# Jira Configuration
JIRA_BASE_URL=${JIRA_BASE_URL}
JIRA_EMAIL=${JIRA_EMAIL}
JIRA_API_TOKEN=${JIRA_API_TOKEN}

# Server Configuration
PORT=3001
NODE_ENV=production

# Security
JWT_SECRET=${JWT_SECRET}
SESSION_TIMEOUT=900000
MAX_SESSION_TIMEOUT=3600000

# Default Admin User
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_EMAIL=admin@localhost
DEFAULT_ADMIN_PASSWORD=ChangeMe123!

# Optional: Azure AD Integration
AZURE_AD_ENABLED=false
EOF

    # Create frontend .env file
    cat > "$DEPLOY_DIR/.env" << EOF
REACT_APP_BACKEND_URL=http://localhost:3001
GENERATE_SOURCEMAP=false
EOF

    # Set secure permissions on config files
    chmod 600 "$DEPLOY_DIR/backend/.env"
    chmod 600 "$DEPLOY_DIR/.env"
    
    echo -e "${GREEN}✅ Configuration files created${NC}"
}

# Function to build frontend
build_frontend() {
    echo -e "${BLUE}🔨 Building frontend...${NC}"
    
    cd "$DEPLOY_DIR"
    npm run build
    
    echo -e "${GREEN}✅ Frontend built${NC}"
}

# Function to setup PM2 and start services
start_services() {
    echo -e "${BLUE}🚀 Starting services...${NC}"
    
    cd "$DEPLOY_DIR"
    
    # Stop any existing processes
    pm2 delete jira-dashboard-backend 2>/dev/null || true
    pm2 delete jira-dashboard-frontend 2>/dev/null || true
    
    # Start services
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Setup PM2 to start on boot (if not already done)
    pm2 startup 2>/dev/null || true
    
    echo -e "${GREEN}✅ Services started${NC}"
}

# Function to test the installation
test_installation() {
    echo -e "${BLUE}🧪 Testing installation...${NC}"
    
    # Wait a moment for services to start
    sleep 5
    
    # Test backend health
    if curl -s http://localhost:3001/health > /dev/null; then
        echo -e "${GREEN}✅ Backend is running${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
    fi
    
    # Check PM2 status
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    pm2 list
}

# Function to show final information
show_completion_info() {
    echo ""
    echo -e "${GREEN}🎉 Setup Complete!${NC}"
    echo "==================="
    echo ""
    echo -e "${BLUE}📊 Your Jira Dashboard is now running:${NC}"
    echo "   Frontend: http://$(hostname -I | awk '{print $1}'):3000"
    echo "   Backend API: http://$(hostname -I | awk '{print $1}'):3001"
    echo ""
    echo -e "${BLUE}🔐 Default Login Credentials:${NC}"
    echo "   Username: admin"
    echo "   Password: ChangeMe123!"
    echo ""
    echo -e "${YELLOW}⚠️  Important Next Steps:${NC}"
    echo "   1. Change the default admin password after first login"
    echo "   2. Consider setting up a reverse proxy (nginx) for production"
    echo "   3. Configure firewall to allow ports 3000 and 3001"
    echo ""
    echo -e "${BLUE}🛠️ Management Commands:${NC}"
    echo "   Check status: pm2 list"
    echo "   View logs: pm2 logs"
    echo "   Restart: pm2 restart all"
    echo "   Stop: pm2 stop all"
    echo ""
    echo -e "${GREEN}✅ Setup completed successfully!${NC}"
}

# Main execution
main() {
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        echo -e "${RED}❌ Don't run this script as root. Run as a regular user with sudo access.${NC}"
        exit 1
    fi
    
    # Check if we have sudo access
    if ! sudo -n true 2>/dev/null; then
        echo -e "${YELLOW}🔐 This script requires sudo access. You may be prompted for your password.${NC}"
        echo ""
    fi
    
    # Execute setup steps
    get_user_config
    install_dependencies
    setup_application
    install_npm_dependencies
    create_config_files
    build_frontend
    start_services
    test_installation
    show_completion_info
}

# Run main function
main "$@"
