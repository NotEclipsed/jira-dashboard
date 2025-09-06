import React, { useState, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, AppBar, Toolbar, Typography, Box, Alert, IconButton, Menu, MenuItem } from '@mui/material';
import { AccountCircle, ExitToApp } from '@mui/icons-material';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import LoadingScreen from './components/LoadingScreen';
import { jiraService } from './services/jiraService';
import { authService } from './services/authService';
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
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Dashboard state
  const [tickets, setTickets] = useState({ assigned: [], created: [] });
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // UI state
  const [anchorEl, setAnchorEl] = useState(null);

  // Check authentication status on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setAuthLoading(true);
        
        // First check if we have cached user data
        const cachedUser = authService.getCachedUser();
        if (cachedUser) {
          setUser(cachedUser);
          setIsAuthenticated(true);
        }
        
        // Then verify with server (this will update state if session is invalid)
        const authStatus = await authService.checkAuthStatus();
        
        if (authStatus.authenticated) {
          // Get fresh user data
          const userResult = await authService.getCurrentUser();
          if (userResult.success) {
            setUser(userResult.user);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Load dashboard data when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadDashboardData = async () => {
      try {
        setDashboardLoading(true);
        setError(null);
        
        // Load user info and tickets
        const userInfo = await jiraService.getCurrentUser();
        
        const [assignedTickets, createdTickets] = await Promise.all([
          jiraService.getAssignedTickets(userInfo.emailAddress),
          jiraService.getCreatedTickets(userInfo.emailAddress)
        ]);
        
        setTickets({
          assigned: assignedTickets,
          created: createdTickets
        });
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        
        // Check if it's an authentication error
        if (err.requiresLogin) {
          handleAuthError();
        } else {
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboardData();
  }, [isAuthenticated, user]);

  const handleAuthError = () => {
    setIsAuthenticated(false);
    setUser(null);
    setTickets({ assigned: [], created: [] });
    setError(null);
  };

  const handleLoginSuccess = (userData, mustChangePassword) => {
    setUser(userData);
    setIsAuthenticated(true);
    setError(null);
    
    // TODO: Handle password change requirement if needed
    if (mustChangePassword) {
      console.log('User must change password');
      // Could show a password change dialog here
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setTickets({ assigned: [], created: [] });
      setError(null);
      setAnchorEl(null);
    }
  };

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Show loading screen while checking authentication
  if (authLoading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <LoadingScreen message="Checking authentication..." />
      </ThemeProvider>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  // Show dashboard if authenticated
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">
                  Welcome, {user.username}
                </Typography>
                <IconButton
                  color="inherit"
                  onClick={handleMenuClick}
                  aria-controls={Boolean(anchorEl) ? 'user-menu' : undefined}
                  aria-haspopup="true"
                  aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  id="user-menu"
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  onClick={handleMenuClose}
                  PaperProps={{
                    elevation: 0,
                    sx: {
                      overflow: 'visible',
                      filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                      mt: 1.5,
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <MenuItem onClick={handleLogout}>
                    <ExitToApp sx={{ mr: 1 }} />
                    Sign Out
                  </MenuItem>
                </Menu>
              </Box>
            )}
          </Toolbar>
        </AppBar>
        
        <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => setError(null)}
            >
              {error}
            </Alert>
          )}
          
          <Dashboard 
            tickets={tickets}
            loading={dashboardLoading}
            user={user}
          />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
