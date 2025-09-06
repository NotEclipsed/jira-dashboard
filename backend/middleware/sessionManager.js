/**
 * HIPAA-Compliant Session Management Middleware
 * Implements automatic session timeout and security controls
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class SessionManager {
  constructor(options = {}) {
    this.sessionTimeout = options.sessionTimeout || 15 * 60 * 1000; // 15 minutes (HIPAA recommendation)
    this.maxSessionTimeout = options.maxSessionTimeout || 60 * 60 * 1000; // 1 hour absolute
    this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    this.activeSessions = new Map();
    
    // Start session cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 60000); // Every minute
  }

  /**
   * Create new session with HIPAA-compliant controls
   */
  createSession(req, userInfo) {
    const sessionId = crypto.randomUUID();
    const now = new Date();
    
    // Support both local auth (id, email, username) and Jira auth (accountId, emailAddress, displayName)
    const userId = userInfo.id || userInfo.accountId;
    const userEmail = userInfo.email || userInfo.emailAddress;
    const userDisplayName = userInfo.username || userInfo.displayName || userInfo.email || userInfo.emailAddress;
    
    const session = {
      id: sessionId,
      userId: userId,
      userEmail: userEmail,
      userDisplayName: userDisplayName,
      createdAt: now,
      lastActivity: now,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      isActive: true
    };

    // Generate JWT token
    const token = jwt.sign({
      sessionId,
      userId: userId,
      email: userEmail,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.sessionTimeout) / 1000)
    }, this.jwtSecret);

    this.activeSessions.set(sessionId, session);
    
    // Log session creation for audit trail
    this.logSecurityEvent('SESSION_CREATED', {
      sessionId,
      userId: userId,
      userEmail: userEmail,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    });

    return { token, sessionId, expiresAt: new Date(Date.now() + this.sessionTimeout) };
  }

  /**
   * Validate session and check for timeout
   */
  validateSession(req, res, next) {
    try {
      const token = this.extractToken(req);
      
      if (!token) {
        return this.handleInvalidSession(res, 'NO_TOKEN', 'Authentication token required');
      }

      // Verify JWT
      const decoded = jwt.verify(token, this.jwtSecret);
      const session = this.activeSessions.get(decoded.sessionId);

      if (!session || !session.isActive) {
        return this.handleInvalidSession(res, 'SESSION_NOT_FOUND', 'Invalid session');
      }

      const now = new Date();
      const timeSinceActivity = now - session.lastActivity;
      const timeSinceCreation = now - session.createdAt;

      // Check session timeout (inactivity)
      if (timeSinceActivity > this.sessionTimeout) {
        this.terminateSession(decoded.sessionId, 'TIMEOUT_INACTIVITY');
        return this.handleInvalidSession(res, 'SESSION_TIMEOUT', 'Session expired due to inactivity');
      }

      // Check absolute maximum session time
      if (timeSinceCreation > this.maxSessionTimeout) {
        this.terminateSession(decoded.sessionId, 'TIMEOUT_ABSOLUTE');
        return this.handleInvalidSession(res, 'SESSION_EXPIRED', 'Session expired - maximum time exceeded');
      }

      // Check IP consistency (optional security measure)
      const currentIP = this.getClientIP(req);
      if (session.ipAddress !== currentIP) {
        this.terminateSession(decoded.sessionId, 'IP_MISMATCH');
        return this.handleInvalidSession(res, 'SESSION_INVALID', 'Session security violation');
      }

      // Update last activity
      session.lastActivity = now;
      
      // Add session info to request
      req.session = {
        id: session.id,
        userId: session.userId,
        userEmail: session.userEmail,
        userDisplayName: session.userDisplayName
      };

      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return this.handleInvalidSession(res, 'INVALID_TOKEN', 'Invalid authentication token');
      } else if (error.name === 'TokenExpiredError') {
        return this.handleInvalidSession(res, 'TOKEN_EXPIRED', 'Authentication token expired');
      }
      
      console.error('Session validation error:', error);
      return this.handleInvalidSession(res, 'VALIDATION_ERROR', 'Session validation failed');
    }
  }

  /**
   * Terminate session
   */
  terminateSession(sessionId, reason = 'USER_LOGOUT') {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.isActive = false;
      this.activeSessions.delete(sessionId);
      
      this.logSecurityEvent('SESSION_TERMINATED', {
        sessionId,
        userId: session.userId,
        userEmail: session.userEmail,
        reason,
        duration: new Date() - session.createdAt
      });
    }
  }

  /**
   * Extract JWT token from request
   */
  extractToken(req) {
    const authHeader = req.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check cookies as fallback
    return req.cookies?.sessionToken;
  }

  /**
   * Get client IP address with proxy support
   */
  getClientIP(req) {
    return req.get('X-Forwarded-For') || 
           req.get('X-Real-IP') || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.ip;
  }

  /**
   * Handle invalid session with proper logging
   */
  handleInvalidSession(res, errorCode, message) {
    this.logSecurityEvent('SESSION_VALIDATION_FAILED', {
      errorCode,
      message,
      timestamp: new Date()
    });

    return res.status(401).json({
      error: 'Authentication required',
      code: errorCode,
      requiresLogin: true
    });
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      const timeSinceActivity = now - session.lastActivity;
      const timeSinceCreation = now - session.createdAt;

      if (timeSinceActivity > this.sessionTimeout || 
          timeSinceCreation > this.maxSessionTimeout) {
        this.terminateSession(sessionId, 'CLEANUP_EXPIRED');
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Log security events for audit trail
   */
  logSecurityEvent(eventType, details) {
    const auditEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      details,
      source: 'SessionManager'
    };

    // In production, send to SIEM/audit system
    console.log('SECURITY_AUDIT:', JSON.stringify(auditEvent));
    
    // TODO: Send to healthcare-compliant audit logging system
    // Examples: Splunk, ELK Stack, Azure Monitor, AWS CloudTrail
  }

  /**
   * Get session statistics for monitoring
   */
  getSessionStats() {
    return {
      activeSessions: this.activeSessions.size,
      sessionTimeout: this.sessionTimeout,
      maxSessionTimeout: this.maxSessionTimeout
    };
  }
}

module.exports = SessionManager;
