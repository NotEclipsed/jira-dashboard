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
      env_development: {
        NODE_ENV: 'development',
        PORT: 3001
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true
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
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ],

  deploy: {
    production: {
      user: 'jira_admin',
      host: ['192.168.146.131'], // Your actual VM IP
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/jira-dashboard.git', // Replace with your repo
      path: '/home/jira_admin/apps',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && cd backend && npm install && cd .. && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
