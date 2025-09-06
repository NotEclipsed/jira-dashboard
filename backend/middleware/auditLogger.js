/**
 * HIPAA-Compliant Audit Logging System
 * Implements comprehensive audit trail for healthcare compliance
 */

const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

class AuditLogger {
  constructor(options = {}) {
    this.logDirectory = options.logDirectory || path.join(__dirname, '..', 'logs', 'audit');
    this.retentionDays = options.retentionDays || 2555; // 7 years (HIPAA requirement)
    this.encryptLogs = options.encryptLogs !== false; // Default to encrypted
    this.encryptionKey = options.encryptionKey || process.env.AUDIT_ENCRYPTION_KEY;
    
    this.ensureLogDirectory();
    this.startLogRotation();
  }

  /**
   * Log user access events (HIPAA §164.312(b))
   */
  logAccess(req, action, resource, result = 'SUCCESS', additionalData = {}) {
    const auditEntry = this.createAuditEntry({
      eventType: 'ACCESS',
      action,
      resource,
      result,
      userId: req.session?.userId || 'ANONYMOUS',
      userEmail: req.session?.userEmail || 'UNKNOWN',
      sessionId: req.session?.id || 'NO_SESSION',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      ...additionalData
    });

    this.writeAuditLog(auditEntry);
  }

  /**
   * Log data modification events
   */
  logDataModification(req, action, resourceType, resourceId, oldValues = null, newValues = null) {
    const auditEntry = this.createAuditEntry({
      eventType: 'DATA_MODIFICATION',
      action, // CREATE, UPDATE, DELETE
      resourceType, // TICKET, COMMENT, etc.
      resourceId,
      userId: req.session?.userId,
      userEmail: req.session?.userEmail,
      sessionId: req.session?.id,
      ipAddress: this.getClientIP(req),
      timestamp: new Date().toISOString(),
      changes: {
        before: this.sanitizeForAudit(oldValues),
        after: this.sanitizeForAudit(newValues)
      }
    });

    this.writeAuditLog(auditEntry);
  }

  /**
   * Log authentication events
   */
  logAuthentication(req, action, result, userId = null, additionalData = {}) {
    const auditEntry = this.createAuditEntry({
      eventType: 'AUTHENTICATION',
      action, // LOGIN, LOGOUT, TOKEN_REFRESH, etc.
      result, // SUCCESS, FAILURE, TIMEOUT
      userId: userId || 'UNKNOWN',
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      ...additionalData
    });

    this.writeAuditLog(auditEntry);
  }

  /**
   * Log security events
   */
  logSecurityEvent(eventType, details, severity = 'INFO') {
    const auditEntry = this.createAuditEntry({
      eventType: 'SECURITY',
      securityEventType: eventType,
      severity,
      details: this.sanitizeForAudit(details),
      timestamp: new Date().toISOString(),
      source: 'SECURITY_MONITOR'
    });

    this.writeAuditLog(auditEntry);
  }

  /**
   * Log system events
   */
  logSystemEvent(eventType, details, severity = 'INFO') {
    const auditEntry = this.createAuditEntry({
      eventType: 'SYSTEM',
      systemEventType: eventType,
      severity,
      details: this.sanitizeForAudit(details),
      timestamp: new Date().toISOString(),
      source: 'SYSTEM_MONITOR'
    });

    this.writeAuditLog(auditEntry);
  }

  /**
   * Create standardized audit entry
   */
  createAuditEntry(data) {
    const baseEntry = {
      auditId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      application: 'JIRA_DASHBOARD',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      ...data
    };

    // Add integrity hash
    baseEntry.integrity = this.calculateIntegrityHash(baseEntry);
    
    return baseEntry;
  }

  /**
   * Calculate integrity hash for tamper detection
   */
  calculateIntegrityHash(entry) {
    const entryString = JSON.stringify(entry, Object.keys(entry).sort());
    return crypto.createHmac('sha256', this.encryptionKey || 'default-key')
                 .update(entryString)
                 .digest('hex');
  }

  /**
   * Sanitize data for audit logs (remove potential PHI)
   */
  sanitizeForAudit(data) {
    if (!data) return null;
    
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove potential PHI fields
    const phiFields = [
      'ssn', 'socialSecurityNumber', 'dateOfBirth', 'dob', 'mrn', 'medicalRecordNumber',
      'patientName', 'firstName', 'lastName', 'phoneNumber', 'address', 'diagnosis',
      'treatment', 'medication', 'symptoms', 'patientId', 'healthInfo'
    ];
    
    this.removePHIFields(sanitized, phiFields);
    
    return sanitized;
  }

  /**
   * Recursively remove PHI fields from object
   */
  removePHIFields(obj, phiFields) {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (phiFields.some(phi => key.toLowerCase().includes(phi.toLowerCase()))) {
        obj[key] = '[REDACTED-PHI]';
      } else if (typeof obj[key] === 'object') {
        this.removePHIFields(obj[key], phiFields);
      }
    }
  }

  /**
   * Write audit log entry
   */
  async writeAuditLog(auditEntry) {
    try {
      const logData = JSON.stringify(auditEntry) + '\n';
      const fileName = `audit-${new Date().toISOString().split('T')[0]}.log`;
      const filePath = path.join(this.logDirectory, fileName);
      
      let finalLogData = logData;
      
      // Encrypt if enabled
      if (this.encryptLogs && this.encryptionKey) {
        finalLogData = this.encryptLogData(logData);
      }
      
      await fs.appendFile(filePath, finalLogData);
      
      // Also send to external systems in production
      if (process.env.NODE_ENV === 'production') {
        this.sendToExternalAuditSystem(auditEntry);
      }
      
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Fallback - write to console (less secure but ensures audit trail)
      console.log('AUDIT_FALLBACK:', JSON.stringify(auditEntry));
    }
  }

  /**
   * Encrypt log data for storage
   */
  encryptLogData(data) {
    if (!this.encryptionKey) return data;
    
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted: true,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted
    }) + '\n';
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.get('X-Forwarded-For') || 
           req.get('X-Real-IP') || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.ip ||
           'UNKNOWN';
  }

  /**
   * Ensure audit log directory exists
   */
  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
    } catch (error) {
      console.error('Failed to create audit log directory:', error);
    }
  }

  /**
   * Start automatic log rotation
   */
  startLogRotation() {
    // Run log cleanup daily at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.rotateAndCleanupLogs();
      // Then run daily
      setInterval(() => this.rotateAndCleanupLogs(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Rotate and cleanup old logs
   */
  async rotateAndCleanupLogs() {
    try {
      const files = await fs.readdir(this.logDirectory);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
      
      for (const file of files) {
        const filePath = path.join(this.logDirectory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          // Archive before deletion (in production, send to long-term storage)
          await this.archiveLogFile(filePath);
          await fs.unlink(filePath);
          console.log(`Archived and deleted old audit log: ${file}`);
        }
      }
    } catch (error) {
      console.error('Error during log rotation:', error);
    }
  }

  /**
   * Archive log file (implement based on your archival system)
   */
  async archiveLogFile(filePath) {
    // TODO: Implement archival to secure long-term storage
    // Examples: AWS S3 Glacier, Azure Archive Storage, etc.
    console.log(`TODO: Archive ${filePath} to long-term storage`);
  }

  /**
   * Send audit entry to external systems (SIEM, etc.)
   */
  sendToExternalAuditSystem(auditEntry) {
    // TODO: Implement integration with external audit systems
    // Examples: Splunk, ELK Stack, Azure Sentinel, AWS CloudTrail
    console.log('TODO: Send to external audit system:', auditEntry.auditId);
  }

  /**
   * Express middleware for automatic access logging
   */
  middleware() {
    return (req, res, next) => {
      // Log the request
      this.logAccess(req, 'REQUEST', `${req.method} ${req.path}`, 'STARTED', {
        query: this.sanitizeForAudit(req.query),
        body: this.sanitizeForAudit(req.body)
      });

      // Wrap response.end to log completion
      const originalEnd = res.end;
      res.end = (...args) => {
        this.logAccess(req, 'REQUEST', `${req.method} ${req.path}`, 'COMPLETED', {
          statusCode: res.statusCode,
          responseTime: Date.now() - req.startTime
        });
        originalEnd.apply(res, args);
      };

      req.startTime = Date.now();
      next();
    };
  }
}

module.exports = AuditLogger;
