# Jira Dashboard

A single pane of glass for managing your Jira tickets. View all tickets assigned to and created by you in a modern, human-friendly interface.

## Features

- 📊 **Dashboard Overview**: Get quick stats on your assigned and created tickets
- 🔍 **Smart Filtering**: Search and filter tickets by status, priority, and project
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🚀 **Quick Actions**: Add comments and update tickets without leaving the dashboard
- 🎨 **Modern UI**: Built with Material-UI for a clean, professional look
- ⚡ **Real-time Data**: Fetches the latest ticket information from Jira

## Screenshots

The dashboard provides two main views:
- **Assigned to Me**: All tickets currently assigned to you
- **Created by Me**: All tickets you have created

Each ticket card shows:
- Ticket key and summary
- Current status and priority
- Project information
- Assignee details
- Creation and last update timestamps
- Quick actions menu

## Prerequisites

- Node.js 16+ and npm
- A Jira Cloud instance
- Jira API token (see setup instructions below)

## Installation

1. **Clone or download this repository**

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and fill in your Jira details:
   ```env
   REACT_APP_JIRA_BASE_URL=https://your-domain.atlassian.net
   REACT_APP_JIRA_EMAIL=your-email@company.com
   REACT_APP_JIRA_API_TOKEN=your-api-token-here
   ```

4. **Start the development server**:
   ```bash
   npm start
   ```

5. **Open your browser** to `http://localhost:3000`

## Jira API Setup

### Step 1: Generate an API Token

1. Go to [Atlassian Account Security](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a meaningful label (e.g., "Jira Dashboard")
4. Copy the generated token (you won't be able to see it again!)

### Step 2: Configure Environment Variables

In your `.env` file:

- **REACT_APP_JIRA_BASE_URL**: Your Jira instance URL (e.g., `https://company.atlassian.net`)
- **REACT_APP_JIRA_EMAIL**: Your Jira account email address
- **REACT_APP_JIRA_API_TOKEN**: The API token you just created

### Step 3: Test the Connection

Start the application and check the browser console for any authentication errors. The dashboard should load your tickets automatically.

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App (not recommended)

## Project Structure

```
jira-dashboard/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Dashboard.js      # Main dashboard component
│   │   ├── TicketCard.js     # Individual ticket card
│   │   └── StatsCard.js      # Statistics display card
│   ├── services/
│   │   └── jiraService.js    # Jira API integration
│   ├── App.js                # Main application component
│   ├── App.css               # Application styles
│   ├── index.js              # Application entry point
│   └── index.css             # Global styles
├── .env.example              # Environment template
├── .gitignore               # Git ignore rules
├── package.json             # Project configuration
└── README.md                # This file
```

## Features in Detail

### Dashboard Statistics
- **Assigned to Me**: Total tickets assigned to you with breakdown by status
- **Created by Me**: Total tickets you've created with completion stats
- **High Priority**: Count of high/highest priority tickets needing attention
- **To Do**: Count of tickets ready to be started

### Ticket Cards
Each ticket displays:
- **Priority indicator**: Color-coded left border
- **Status chip**: Current ticket status with appropriate colors
- **Project information**: Project name and avatar
- **Assignee details**: Who the ticket is assigned to
- **Timestamps**: When created and last updated
- **Quick actions**: Add comments or open in Jira

### Filtering and Search
- **Text search**: Search by ticket key, summary, or project name
- **Status filter**: Filter by any ticket status
- **Priority filter**: Filter by priority level
- **Tab switching**: Toggle between assigned and created tickets

### Interactive Features
- **Add Comments**: Click the menu button on any ticket to add comments
- **Open in Jira**: Quick link to view the full ticket in Jira
- **Success/Error Notifications**: Visual feedback for all actions

## API Integration

The application uses Jira REST API v3 with the following endpoints:

- `GET /rest/api/3/myself` - Get current user information
- `GET /rest/api/3/search` - Search for tickets using JQL
- `POST /rest/api/3/issue/{key}/comment` - Add comments to tickets
- `GET /rest/api/3/issue/{key}/transitions` - Get available transitions
- `POST /rest/api/3/issue/{key}/transitions` - Update ticket status

All API calls are authenticated using Basic Auth with email and API token.

## Security Notes

- **API Token**: Keep your API token secure and never commit it to version control
- **Environment Variables**: The `.env` file is automatically ignored by Git
- **CORS**: This is a client-side application, so your Jira instance must allow CORS requests
- **Permissions**: The application can only access tickets you have permission to view

## Troubleshooting

### Common Issues

**"Failed to get user info"**
- Check that your Jira base URL is correct (no trailing slash)
- Verify your email address matches your Jira account
- Ensure your API token is valid and not expired

**"No tickets found"**
- Verify you have tickets assigned to or created by you in Jira
- Check that your Jira permissions allow viewing tickets
- Look at the browser console for detailed error messages

**CORS Errors**
- This application makes requests from the browser to Jira
- Some Jira configurations may block cross-origin requests
- Consider setting up a proxy server for production use

**Slow Loading**
- The application fetches all tickets on load
- For users with many tickets, consider implementing pagination
- Network requests to Jira may be slow depending on your instance location

## Customization

The application is built with React and Material-UI, making it easy to customize:

- **Styling**: Modify colors and themes in `src/App.js` and CSS files
- **Components**: Add new features by creating components in `src/components/`
- **API**: Extend the Jira service in `src/services/jiraService.js`
- **Filters**: Add new filtering options in the Dashboard component

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Jira API configuration
3. Ensure you have the necessary Jira permissions
4. Review the troubleshooting section above

For feature requests or bugs, please open an issue in the repository.
