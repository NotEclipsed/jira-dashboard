import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
  Link,
  Alert,
  Snackbar
} from '@mui/material';
import {
  MoreVert,
  OpenInNew,
  Comment,
  Update,
  AccessTime,
  Person,
  Flag
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import { jiraService } from '../services/jiraService';

function TicketCard({ ticket }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [commentDialog, setCommentDialog] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'success' });

  const handleMenuClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleOpenTicket = () => {
    window.open(ticket.url, '_blank');
    handleMenuClose();
  };

  const showNotification = (message, severity = 'success') => {
    setNotification({ open: true, message, severity });
  };

  const handleCloseNotification = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setNotification({ ...notification, open: false });
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    
    try {
      setLoading(true);
      await jiraService.addComment(ticket.key, comment);
      setComment('');
      setCommentDialog(false);
      showNotification(`Comment added successfully to ${ticket.key}`, 'success');
    } catch (error) {
      console.error('Failed to add comment:', error);
      showNotification(`Failed to add comment: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (level) => {
    switch (level) {
      case 'highest':
        return '#ff5630';
      case 'high':
        return '#ff8b00';
      case 'medium':
        return '#0065ff';
      case 'low':
        return '#36b37e';
      case 'lowest':
        return '#6b778c';
      default:
        return '#6b778c';
    }
  };

  const getStatusColor = (category) => {
    switch (category.toLowerCase()) {
      case 'to do':
        return '#dfe1e6';
      case 'in progress':
        return '#0065ff';
      case 'done':
        return '#36b37e';
      default:
        return '#dfe1e6';
    }
  };

  const getStatusTextColor = (category) => {
    switch (category.toLowerCase()) {
      case 'to do':
        return '#42526e';
      case 'in progress':
        return 'white';
      case 'done':
        return 'white';
      default:
        return '#42526e';
    }
  };

  return (
    <>
      <Card 
        className="ticket-card"
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          borderLeft: `4px solid ${getPriorityColor(ticket.priority.level)}`,
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 3
          }
        }}
      >
        <CardContent sx={{ flexGrow: 1, pb: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Link
                href={ticket.url}
                target="_blank"
                rel="noopener"
                color="primary"
                sx={{ fontWeight: 600, textDecoration: 'none' }}
              >
                {ticket.key}
              </Link>
              <img 
                src={ticket.issueType.icon} 
                alt={ticket.issueType.name}
                width="16" 
                height="16"
                style={{ marginLeft: '4px' }}
              />
            </Box>
            <IconButton 
              size="small" 
              onClick={handleMenuClick}
              sx={{ ml: 1 }}
            >
              <MoreVert fontSize="small" />
            </IconButton>
          </Box>

          {/* Title */}
          <Typography 
            variant="h6" 
            component="h3" 
            sx={{ 
              fontSize: '1rem',
              fontWeight: 500,
              lineHeight: 1.3,
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {ticket.summary}
          </Typography>

          {/* Status and Priority */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
            <Chip
              label={ticket.status.name}
              size="small"
              sx={{
                backgroundColor: getStatusColor(ticket.status.category),
                color: getStatusTextColor(ticket.status.category),
                fontWeight: 600,
                fontSize: '0.75rem'
              }}
            />
            <Chip
              icon={<Flag fontSize="small" />}
              label={ticket.priority.name}
              size="small"
              variant="outlined"
              sx={{
                borderColor: getPriorityColor(ticket.priority.level),
                color: getPriorityColor(ticket.priority.level),
                fontSize: '0.75rem'
              }}
            />
          </Box>

          {/* Project */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Avatar 
              src={ticket.project.avatar} 
              sx={{ width: 20, height: 20 }}
            >
              {ticket.project.key[0]}
            </Avatar>
            <Typography variant="body2" color="textSecondary">
              {ticket.project.name}
            </Typography>
          </Box>

          {/* Assignee */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Person fontSize="small" color="action" />
            {ticket.assignee ? (
              <>
                <Avatar 
                  src={ticket.assignee.avatar} 
                  sx={{ width: 24, height: 24 }}
                >
                  {ticket.assignee.displayName[0]}
                </Avatar>
                <Typography variant="body2" color="textSecondary">
                  {ticket.assignee.displayName}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                Unassigned
              </Typography>
            )}
          </Box>

          {/* Timestamps */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto' }}>
            <Tooltip title={`Created: ${format(ticket.created, 'PPP p')}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <AccessTime fontSize="small" color="action" />
                <Typography variant="caption" color="textSecondary">
                  {formatDistanceToNow(ticket.created, { addSuffix: true })}
                </Typography>
              </Box>
            </Tooltip>
            <Tooltip title={`Updated: ${format(ticket.updated, 'PPP p')}`}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Update fontSize="small" color="action" />
                <Typography variant="caption" color="textSecondary">
                  {formatDistanceToNow(ticket.updated, { addSuffix: true })}
                </Typography>
              </Box>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleOpenTicket}>
          <OpenInNew fontSize="small" sx={{ mr: 1 }} />
          Open in Jira
        </MenuItem>
        <MenuItem onClick={() => {
          setCommentDialog(true);
          handleMenuClose();
        }}>
          <Comment fontSize="small" sx={{ mr: 1 }} />
          Add Comment
        </MenuItem>
      </Menu>

      {/* Comment Dialog */}
      <Dialog open={commentDialog} onClose={() => setCommentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Comment to {ticket.key}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Comment"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleAddComment}
            variant="contained"
            disabled={!comment.trim() || loading}
          >
            {loading ? 'Adding...' : 'Add Comment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default TicketCard;
