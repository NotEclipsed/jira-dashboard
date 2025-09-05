import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Box, Alert } from '@mui/material';
import Dashboard from './components/Dashboard';
import { jiraService } from './services/jiraService';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#0052CC', // Jira blue
    },
    secondary: {
      main: '#36B37E', // Jira green
    },
  },
});

function App() {
  const [tickets, setTickets] = useState({ assigned: [], created: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load user info and tickets
        const userInfo = await jiraService.getCurrentUser();
        setUser(userInfo);
        
        const [assignedTickets, createdTickets] = await Promise.all([
          jiraService.getAssignedTickets(userInfo.emailAddress),
          jiraService.getCreatedTickets(userInfo.emailAddress)
        ]);
        
        setTickets({
          assigned: assignedTickets,
          created: createdTickets
        });
      } catch (err) {
        setError(err.message);
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Jira Dashboard
            </Typography>
            {user && (
              <Typography variant="body2">
                Welcome, {user.displayName}
              </Typography>
            )}
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <Dashboard 
            tickets={tickets}
            loading={loading}
            user={user}
          />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
