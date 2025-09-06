# ⚡ One-Command Jira Dashboard Setup

The simplest possible way to install and run the Jira Dashboard on your server.

## 🚀 Single Command Installation

Run this **one command** on your Ubuntu server:

```bash
curl -s https://raw.githubusercontent.com/NotEclipsed/jira-dashboard/master/scripts/auto-setup.sh | bash
```

## 📝 What You'll Be Asked For

The script will prompt you for **only 3 things**:

1. **Jira Base URL** (e.g., `https://yourcompany.atlassian.net`)
2. **Your Jira Email** (e.g., `you@company.com`)  
3. **Your Jira API Token** (your existing token)

That's it! Everything else is automated.

## ⏱️ What Happens Automatically

The script will:
- ✅ Install Node.js and PM2 if needed
- ✅ Download the latest application code
- ✅ Install all dependencies
- ✅ Create configuration files with your settings
- ✅ Build the frontend
- ✅ Start both backend and frontend services
- ✅ Configure services to start on server reboot
- ✅ Test that everything is working

## 🎯 After Installation

**Your dashboard will be running at:**
- Frontend: `http://your-server-ip:3000`
- Login: `admin` / `ChangeMe123!`

**Management commands:**
- Check status: `pm2 list`
- View logs: `pm2 logs`
- Restart: `pm2 restart all`

## 🔒 Security Features

- Automatically generates secure JWT secrets
- Sets proper file permissions on config files
- Runs with least-privilege principles
- Session timeout and security controls enabled

## 🛠️ Alternative: Manual Download

If the one-command approach doesn't work, you can download the script manually:

```bash
# Download the script
wget https://raw.githubusercontent.com/NotEclipsed/jira-dashboard/master/scripts/auto-setup.sh

# Make it executable
chmod +x auto-setup.sh

# Run it
./auto-setup.sh
```

## 📞 Support

If you encounter any issues:

1. **Check the logs**: `pm2 logs`
2. **Check service status**: `pm2 list`
3. **Test backend**: `curl http://localhost:3001/health`

The script provides detailed output at each step, so you can see exactly where any issues occur.

---

**That's it!** Your secure, production-ready Jira Dashboard will be running in just a few minutes! 🎉
