import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Assignment,
  Create,
  FilterList
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import TicketCard from './TicketCard';
import StatsCard from './StatsCard';

function Dashboard({ tickets, loading, user }) {
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // Get unique statuses and priorities for filters
  const allTickets = [...tickets.assigned, ...tickets.created];
  const uniqueStatuses = [...new Set(allTickets.map(ticket => ticket.status.name))];
  const uniquePriorities = [...new Set(allTickets.map(ticket => ticket.priority.name))];

  // Filter tickets based on search and filters
  const filteredTickets = useMemo(() => {
    const ticketsToFilter = activeTab === 0 ? tickets.assigned : tickets.created;
    
    return ticketsToFilter.filter(ticket => {
      const matchesSearch = !searchTerm || 
        ticket.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.project.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || ticket.status.name === statusFilter;
      const matchesPriority = priorityFilter === 'all' || ticket.priority.name === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tickets, activeTab, searchTerm, statusFilter, priorityFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const assignedStats = {
      total: tickets.assigned.length,
      todo: tickets.assigned.filter(t => t.status.category === 'To Do').length,
      inProgress: tickets.assigned.filter(t => t.status.category === 'In Progress').length,
      done: tickets.assigned.filter(t => t.status.category === 'Done').length,
      highPriority: tickets.assigned.filter(t => 
        t.priority.level === 'high' || t.priority.level === 'highest'
      ).length
    };

    const createdStats = {
      total: tickets.created.length,
      todo: tickets.created.filter(t => t.status.category === 'To Do').length,
      inProgress: tickets.created.filter(t => t.status.category === 'In Progress').length,
      done: tickets.created.filter(t => t.status.category === 'Done').length,
      highPriority: tickets.created.filter(t => 
        t.priority.level === 'high' || t.priority.level === 'highest'
      ).length
    };

    return { assigned: assignedStats, created: createdStats };
  }, [tickets]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
    // Reset filters when switching tabs
    setSearchTerm('');
    setStatusFilter('all');
    setPriorityFilter('all');
  };

  if (loading) {
    return (
      <Box className="loading-container">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading your tickets...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats Cards */}
      <Grid container spacing={3} className="dashboard-stats">
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Assigned to Me"
            value={stats.assigned.total}
            subtitle={`${stats.assigned.inProgress} in progress`}
            color="primary"
            icon={<Assignment />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="Created by Me"
            value={stats.created.total}
            subtitle={`${stats.created.done} completed`}
            color="secondary"
            icon={<Create />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="High Priority"
            value={activeTab === 0 ? stats.assigned.highPriority : stats.created.highPriority}
            subtitle="Needs attention"
            color="warning"
            icon={<FilterList />}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard
            title="To Do"
            value={activeTab === 0 ? stats.assigned.todo : stats.created.todo}
            subtitle="Ready to start"
            color="info"
            icon={<Assignment />}
          />
        </Grid>
      </Grid>

      {/* Main Content */}
      <Paper sx={{ mt: 3 }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="ticket tabs">
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Assignment />
                  Assigned to Me
                  <Chip label={tickets.assigned.length} size="small" />
                </Box>
              } 
            />
            <Tab 
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Create />
                  Created by Me
                  <Chip label={tickets.created.length} size="small" />
                </Box>
              } 
            />
          </Tabs>
        </Box>

        {/* Filters */}
        <Box sx={{ p: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                label="Search tickets"
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, key, or project..."
              />
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Statuses</MenuItem>
                  {uniqueStatuses.map(status => (
                    <MenuItem key={status} value={status}>{status}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Priority"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <MenuItem value="all">All Priorities</MenuItem>
                  {uniquePriorities.map(priority => (
                    <MenuItem key={priority} value={priority}>{priority}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={12} md={4}>
              <Typography variant="body2" color="textSecondary">
                Showing {filteredTickets.length} of {activeTab === 0 ? tickets.assigned.length : tickets.created.length} tickets
              </Typography>
            </Grid>
          </Grid>
        </Box>

        {/* Tickets List */}
        <Box sx={{ p: 3 }}>
          {filteredTickets.length === 0 ? (
            <Box className="empty-state">
              <Typography variant="h6" gutterBottom>
                No tickets found
              </Typography>
              <Typography variant="body2">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                  ? 'Try adjusting your filters to see more tickets.'
                  : activeTab === 0 
                    ? 'You have no tickets assigned to you.'
                    : 'You have not created any tickets.'
                }
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredTickets.map(ticket => (
                <Grid item xs={12} md={6} lg={4} key={ticket.key}>
                  <TicketCard ticket={ticket} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

export default Dashboard;
