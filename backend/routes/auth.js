/**
 * Authentication Routes
 * Handles login, logout, password changes, and Azure AD integration
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const userService = require('../services/userService');
const SessionManager = require('../middleware/sessionManager');
const AuditLogger = require('../middleware/auditLogger');

const router = express.Router();
const sessionManager = new SessionManager({
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 15 * 60 * 1000,
  maxSessionTimeout: parseInt(process.env.MAX_SESSION_TIMEOUT) || 60 * 60 * 1000
});
const auditLogger = new AuditLogger();

/**
 * POST /auth/login
 * Local user authentication
 */
router.post('/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      auditLogger.logAuthentication(req, 'LOGIN', 'VALIDATION_FAILED');
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { username, password } = req.body;

    // Authenticate user
    const authResult = await userService.authenticateUser(username, password);
    
    if (!authResult.success) {
      auditLogger.logAuthentication(req, 'LOGIN', 'FAILED', null, {
        username,
        error: authResult.error
      });
      
      return res.status(401).json({
        error: authResult.error
      });
    }

    // Create session
    const sessionInfo = sessionManager.createSession(req, authResult.user);
    
    auditLogger.logAuthentication(req, 'LOGIN', 'SUCCESS', authResult.user.id, {
      username: authResult.user.username,
      sessionId: sessionInfo.sessionId,
      mustChangePassword: authResult.mustChangePassword
    });

    // Set secure cookie
    res.cookie('sessionToken', sessionInfo.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: sessionManager.sessionTimeout
    });

    res.json({
      success: true,
      user: {
        id: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email,
        role: authResult.user.role,
        mustChangePassword: authResult.mustChangePassword,
        preferences: authResult.user.preferences
      },
      sessionExpires: sessionInfo.expiresAt
    });
  } catch (error) {
    console.error('Login error:', error);
    auditLogger.logAuthentication(req, 'LOGIN', 'ERROR');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/logout
 * User logout
 */
router.post('/logout', sessionManager.validateSession.bind(sessionManager), (req, res) => {
  try {
    const sessionId = req.session.id;
    const userId = req.session.userId;
    
    // Terminate session
    sessionManager.terminateSession(sessionId, 'USER_LOGOUT');
    
    auditLogger.logAuthentication(req, 'LOGOUT', 'SUCCESS', userId, {
      sessionId
    });

    // Clear cookie
    res.clearCookie('sessionToken');
    
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/me
 * Get current user info
 */
router.get('/me', sessionManager.validateSession.bind(sessionManager), (req, res) => {
  try {
    const user = userService.getUserById(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        preferences: user.preferences,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/change-password
 * Change user password
 */
router.post('/change-password', [
  sessionManager.validateSession.bind(sessionManager),
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    const result = await userService.changePassword(userId, currentPassword, newPassword);
    
    auditLogger.logAuthentication(req, 'PASSWORD_CHANGE', result.success ? 'SUCCESS' : 'FAILED', userId, {
      error: result.error || undefined
    });

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/update-profile
 * Update user profile
 */
router.post('/update-profile', [
  sessionManager.validateSession.bind(sessionManager),
  body('email').optional().isEmail().withMessage('Valid email is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const userId = req.session.userId;
    const updates = req.body;

    const result = await userService.updateUserProfile(userId, updates);
    
    auditLogger.logDataModification(req, 'UPDATE', 'USER_PROFILE', userId, null, updates);

    if (result.success) {
      res.json({ success: true, user: result.user });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/session-status
 * Check session validity
 */
router.get('/session-status', sessionManager.validateSession.bind(sessionManager), (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.session.userId,
      username: req.session.userDisplayName
    },
    sessionId: req.session.id
  });
});

/**
 * Admin Routes
 */

/**
 * GET /auth/admin/users
 * Get all users (admin only)
 */
router.get('/admin/users', [
  sessionManager.validateSession.bind(sessionManager),
  requireAdmin
], (req, res) => {
  try {
    const users = userService.getAllUsers();
    auditLogger.logAccess(req, 'VIEW', 'ALL_USERS');
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /auth/admin/users
 * Create new user (admin only)
 */
router.post('/admin/users', [
  sessionManager.validateSession.bind(sessionManager),
  requireAdmin,
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Role must be admin or user')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const result = await userService.createUser(req.body);
    
    auditLogger.logDataModification(req, 'CREATE', 'USER', result.user?.id, null, {
      username: req.body.username,
      email: req.body.email,
      role: req.body.role
    });

    if (result.success) {
      res.status(201).json({ success: true, user: result.user });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /auth/admin/users/:userId/activate
 * Activate/deactivate user (admin only)
 */
router.put('/admin/users/:userId/activate', [
  sessionManager.validateSession.bind(sessionManager),
  requireAdmin
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { activate } = req.body;

    const result = activate ? 
      await userService.activateUser(userId) : 
      await userService.deactivateUser(userId);
    
    auditLogger.logDataModification(req, activate ? 'ACTIVATE' : 'DEACTIVATE', 'USER', userId);

    if (result) {
      res.json({ success: true, message: `User ${activate ? 'activated' : 'deactivated'} successfully` });
    } else {
      res.status(400).json({ error: 'Failed to update user status' });
    }
  } catch (error) {
    console.error('User activation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /auth/admin/audit-logs
 * Get audit logs (admin only)
 */
router.get('/admin/audit-logs', [
  sessionManager.validateSession.bind(sessionManager),
  requireAdmin
], async (req, res) => {
  try {
    // This would integrate with the audit logging system
    // For now, return placeholder
    auditLogger.logAccess(req, 'VIEW', 'AUDIT_LOGS');
    
    res.json({
      logs: [],
      message: 'Audit log integration pending - check server logs'
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Middleware to require admin role
 */
function requireAdmin(req, res, next) {
  const user = userService.getUserById(req.session.userId);
  
  if (!user || user.role !== 'admin') {
    auditLogger.logAccess(req, 'UNAUTHORIZED_ADMIN_ACCESS', 'ADMIN_ENDPOINT', 'DENIED');
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
}

module.exports = router;
