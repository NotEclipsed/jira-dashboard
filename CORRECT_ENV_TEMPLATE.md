# 🔧 Correct Environment File Templates

Use these templates on your VM with your actual Jira credentials.

## Frontend .env (~/jira-dashboard/.env)
```env
# Frontend Configuration
REACT_APP_BACKEND_URL=http://192.168.146.131:3001
```

## Backend .env (~/jira-dashboard/backend/.env)
```env
# Jira API Configuration
JIRA_BASE_URL=https://your-actual-domain.atlassian.net
JIRA_EMAIL=your-actual-email@domain.com
JIRA_API_TOKEN="your-actual-api-token-with-equals-in-quotes"

# Network Configuration
PORT=3001
CORS_ORIGIN=http://10.0.0.63:3000
NODE_ENV=development

# Simple Authentication
JWT_SECRET=test-jwt-secret-for-development
SESSION_SECRET=test-session-secret-for-development

# Disable enterprise features for testing
PHI_DETECTION_ENABLED=false
COMPLIANCE_MODE=development

# Default admin account
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=ChangeMe123!
DEFAULT_ADMIN_EMAIL=admin@localhost
```

## Create These on VM

```bash
cd ~/jira-dashboard

# Create frontend .env
cat > .env << 'EOF'
REACT_APP_BACKEND_URL=http://192.168.146.131:3001
EOF

# Create backend .env (replace with your actual Jira details)
cat > backend/.env << 'EOF'
JIRA_BASE_URL=https://your-actual-domain.atlassian.net
JIRA_EMAIL=your-actual-email@domain.com
JIRA_API_TOKEN="your-actual-api-token-with-equals-in-quotes"
PORT=3001
CORS_ORIGIN=http://10.0.0.63:3000
NODE_ENV=development
JWT_SECRET=test-jwt-secret-for-development
SESSION_SECRET=test-session-secret-for-development
PHI_DETECTION_ENABLED=false
COMPLIANCE_MODE=development
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=ChangeMe123!
DEFAULT_ADMIN_EMAIL=admin@localhost
EOF
```
