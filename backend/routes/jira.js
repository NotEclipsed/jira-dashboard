/**
 * Secure Jira API Routes
 * All Jira API interactions with proper validation and error handling
 */

const express = require('express');
const axios = require('axios');
const { body, param, query, validationResult } = require('express-validator');
const { 
  buildAssignedTicketsQuery, 
  buildCreatedTicketsQuery, 
  validateQueryParams 
} = require('../utils/jqlUtils');
const { 
  validateComment, 
  validateIssueKey, 
  validateTransitionId, 
  sanitizeErrorMessage 
} = require('../utils/validation');
const SessionManager = require('../middleware/sessionManager');
const AuditLogger = require('../middleware/auditLogger');

// Initialize middleware instances
const sessionManager = new SessionManager();
const auditLogger = new AuditLogger();

const router = express.Router();

// Create axios instance for Jira API calls
const createJiraClient = () => {
  return axios.create({
    baseURL: `${process.env.JIRA_BASE_URL}/rest/api/3`,
    auth: {
      username: process.env.JIRA_EMAIL,
      password: process.env.JIRA_API_TOKEN
    },
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000 // 30 second timeout
  });
};

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

/**
 * GET /api/jira/user
 * Get current user information
 */
router.get('/user', sessionManager.validateSession.bind(sessionManager), async (req, res, next) => {
  try {
    const jiraClient = createJiraClient();
    const response = await jiraClient.get('/myself');
    
    // Only return necessary user info, filter out sensitive data
    const userData = {
      accountId: response.data.accountId,
      displayName: response.data.displayName,
      emailAddress: response.data.emailAddress,
      avatarUrls: response.data.avatarUrls
    };
    
    auditLogger.logAccess(req, 'GET_USER_INFO', 'JIRA_USER_DATA');
    res.json(userData);
  } catch (error) {
    console.error('Failed to get user info:', error.message);
    next(error);
  }
});

/**
 * GET /api/jira/tickets/assigned
 * Get tickets assigned to the current user
 */
router.get('/tickets/assigned', [
  sessionManager.validateSession.bind(sessionManager),
  query('maxResults').optional().isInt({ min: 1, max: 100 }),
  query('startAt').optional().isInt({ min: 0 }),
  handleValidationErrors
], async (req, res, next) => {
  try {
    const jiraClient = createJiraClient();
    
    // Get user email first
    const userResponse = await jiraClient.get('/myself');
    const userEmail = userResponse.data.emailAddress;
    
    // Build safe JQL query
    const jql = buildAssignedTicketsQuery(userEmail);
    const queryParams = validateQueryParams(req.query);
    
    const response = await jiraClient.get('/search', {
      params: {
        jql,
        ...queryParams
      }
    });
    
    // Transform and sanitize issue data
    const transformedIssues = response.data.issues.map(transformIssue);
    
    auditLogger.logAccess(req, 'GET_ASSIGNED_TICKETS', `JIRA_TICKETS:${transformedIssues.length}`);
    res.json({
      issues: transformedIssues,
      total: response.data.total,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults
    });
  } catch (error) {
    console.error('Failed to get assigned tickets:', error.message);
    next(error);
  }
});

/**
 * GET /api/jira/tickets/created
 * Get tickets created by the current user
 */
router.get('/tickets/created', [
  sessionManager.validateSession.bind(sessionManager),
  query('maxResults').optional().isInt({ min: 1, max: 100 }),
  query('startAt').optional().isInt({ min: 0 }),
  handleValidationErrors
], async (req, res, next) => {
  try {
    const jiraClient = createJiraClient();
    
    // Get user email first
    const userResponse = await jiraClient.get('/myself');
    const userEmail = userResponse.data.emailAddress;
    
    // Build safe JQL query
    const jql = buildCreatedTicketsQuery(userEmail);
    const queryParams = validateQueryParams(req.query);
    
    const response = await jiraClient.get('/search', {
      params: {
        jql,
        ...queryParams
      }
    });
    
    // Transform and sanitize issue data
    const transformedIssues = response.data.issues.map(transformIssue);
    
    auditLogger.logAccess(req, 'GET_CREATED_TICKETS', `JIRA_TICKETS:${transformedIssues.length}`);
    res.json({
      issues: transformedIssues,
      total: response.data.total,
      startAt: response.data.startAt,
      maxResults: response.data.maxResults
    });
  } catch (error) {
    console.error('Failed to get created tickets:', error.message);
    next(error);
  }
});

/**
 * POST /api/jira/tickets/:issueKey/comment
 * Add comment to a ticket
 */
router.post('/tickets/:issueKey/comment', [
  sessionManager.validateSession.bind(sessionManager),
  param('issueKey').custom(value => {
    const validation = validateIssueKey(value);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return true;
  }),
  body('comment').custom(value => {
    const validation = validateComment(value);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return true;
  }),
  handleValidationErrors
], async (req, res, next) => {
  try {
    const { issueKey } = req.params;
    const commentValidation = validateComment(req.body.comment);
    
    if (!commentValidation.isValid) {
      return res.status(400).json({ error: commentValidation.error });
    }
    
    const jiraClient = createJiraClient();
    
    const response = await jiraClient.post(`/issue/${issueKey}/comment`, {
      body: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: commentValidation.sanitized
              }
            ]
          }
        ]
      }
    });
    
    auditLogger.logDataModification(req, 'CREATE', 'JIRA_COMMENT', issueKey, null, {
      commentId: response.data.id,
      issueKey
    });
    
    res.json({
      success: true,
      commentId: response.data.id,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Failed to add comment:', error.message);
    next(error);
  }
});

/**
 * GET /api/jira/tickets/:issueKey/transitions
 * Get available transitions for a ticket
 */
router.get('/tickets/:issueKey/transitions', [
  sessionManager.validateSession.bind(sessionManager),
  param('issueKey').custom(value => {
    const validation = validateIssueKey(value);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return true;
  }),
  handleValidationErrors
], async (req, res, next) => {
  try {
    const { issueKey } = req.params;
    const jiraClient = createJiraClient();
    
    const response = await jiraClient.get(`/issue/${issueKey}/transitions`);
    
    res.json({
      transitions: response.data.transitions.map(transition => ({
        id: transition.id,
        name: transition.name,
        to: {
          id: transition.to.id,
          name: transition.to.name,
          statusCategory: transition.to.statusCategory
        }
      }))
    });
  } catch (error) {
    console.error('Failed to get transitions:', error.message);
    next(error);
  }
});

/**
 * POST /api/jira/tickets/:issueKey/transition
 * Update ticket status
 */
router.post('/tickets/:issueKey/transition', [
  sessionManager.validateSession.bind(sessionManager),
  param('issueKey').custom(value => {
    const validation = validateIssueKey(value);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return true;
  }),
  body('transitionId').custom(value => {
    const validation = validateTransitionId(value);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    return true;
  }),
  handleValidationErrors
], async (req, res, next) => {
  try {
    const { issueKey } = req.params;
    const transitionValidation = validateTransitionId(req.body.transitionId);
    
    if (!transitionValidation.isValid) {
      return res.status(400).json({ error: transitionValidation.error });
    }
    
    const jiraClient = createJiraClient();
    
    await jiraClient.post(`/issue/${issueKey}/transitions`, {
      transition: { id: transitionValidation.id.toString() }
    });
    
    res.json({
      success: true,
      message: 'Ticket status updated successfully'
    });
  } catch (error) {
    console.error('Failed to update ticket status:', error.message);
    next(error);
  }
});

/**
 * Transform raw Jira issue data into a safe, sanitized format
 */
function transformIssue(issue) {
  return {
    key: issue.key,
    id: issue.id,
    summary: issue.fields.summary || 'No summary',
    description: issue.fields.description || '',
    status: {
      name: issue.fields.status?.name || 'Unknown',
      category: issue.fields.status?.statusCategory?.name || 'Unknown',
      color: issue.fields.status?.statusCategory?.colorName || 'gray'
    },
    priority: {
      name: issue.fields.priority?.name || 'None',
      level: getPriorityLevel(issue.fields.priority?.name)
    },
    issueType: {
      name: issue.fields.issuetype?.name || 'Unknown',
      icon: issue.fields.issuetype?.iconUrl || ''
    },
    assignee: issue.fields.assignee ? {
      displayName: issue.fields.assignee.displayName || 'Unknown User',
      emailAddress: issue.fields.assignee.emailAddress || '',
      avatar: issue.fields.assignee.avatarUrls?.['32x32'] || ''
    } : null,
    reporter: issue.fields.reporter ? {
      displayName: issue.fields.reporter.displayName || 'Unknown User',
      emailAddress: issue.fields.reporter.emailAddress || '',
      avatar: issue.fields.reporter.avatarUrls?.['32x32'] || ''
    } : null,
    project: {
      key: issue.fields.project?.key || 'UNKNOWN',
      name: issue.fields.project?.name || 'Unknown Project',
      avatar: issue.fields.project?.avatarUrls?.['32x32'] || ''
    },
    created: issue.fields.created ? new Date(issue.fields.created).toISOString() : null,
    updated: issue.fields.updated ? new Date(issue.fields.updated).toISOString() : null,
    url: `${process.env.JIRA_BASE_URL}/browse/${issue.key}`
  };
}

/**
 * Get priority level for styling
 */
function getPriorityLevel(priorityName) {
  if (!priorityName) return 'low';
  
  const priority = priorityName.toLowerCase();
  if (priority.includes('highest') || priority.includes('critical')) return 'highest';
  if (priority.includes('high')) return 'high';
  if (priority.includes('medium')) return 'medium';
  if (priority.includes('low')) return 'low';
  if (priority.includes('lowest')) return 'lowest';
  return 'medium';
}

module.exports = router;
