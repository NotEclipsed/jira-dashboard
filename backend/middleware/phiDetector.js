/**
 * PHI Detection and Data Sanitization Middleware
 * Prevents Protected Health Information from being processed or logged
 */

const crypto = require('crypto');

class PHIDetector {
  constructor(options = {}) {
    this.strictMode = options.strictMode !== false; // Default to strict
    this.logViolations = options.logViolations !== false;
    this.blockOnDetection = options.blockOnDetection !== false;
    
    // Initialize detection patterns
    this.initializePatterns();
  }

  /**
   * Initialize PHI detection patterns
   */
  initializePatterns() {
    this.patterns = {
      // Social Security Numbers
      ssn: {
        regex: /\b(?:\d{3}-?\d{2}-?\d{4})\b/g,
        description: 'Social Security Number'
      },
      
      // Medical Record Numbers (common patterns)
      mrn: {
        regex: /\b(?:MRN|mrn|medical\s*record\s*(?:number|#)?)\s*:?\s*[\w\d-]{6,20}\b/gi,
        description: 'Medical Record Number'
      },
      
      // Phone Numbers
      phone: {
        regex: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
        description: 'Phone Number'
      },
      
      // Email addresses (potential PHI in healthcare context)
      email: {
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        description: 'Email Address'
      },
      
      // Dates of Birth patterns
      dob: {
        regex: /\b(?:dob|date\s*of\s*birth|born|birthday)\s*:?\s*(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{2,4}[\/\-]\d{1,2}[\/\-]\d{1,2})\b/gi,
        description: 'Date of Birth'
      },
      
      // Addresses (basic pattern)
      address: {
        regex: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
        description: 'Street Address'
      },
      
      // Insurance/Member IDs
      insurance: {
        regex: /\b(?:insurance|member|policy)\s*(?:id|number|#)?\s*:?\s*[\w\d-]{8,20}\b/gi,
        description: 'Insurance ID'
      },
      
      // Common healthcare identifiers
      patientId: {
        regex: /\b(?:patient|pat)\s*(?:id|number|#)\s*:?\s*[\w\d-]{5,15}\b/gi,
        description: 'Patient ID'
      },
      
      // Credit Card Numbers (Luhn algorithm validation)
      creditCard: {
        regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
        description: 'Credit Card Number',
        validator: this.isValidCreditCard
      }
    };
  }

  /**
   * Validate credit card number using Luhn algorithm
   */
  isValidCreditCard(number) {
    const digits = number.replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 19) return false;
    
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  }

  /**
   * Scan text for PHI patterns
   */
  scanForPHI(text, context = {}) {
    if (!text || typeof text !== 'string') return { hasPHI: false, findings: [] };
    
    const findings = [];
    
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern.regex);
      
      if (matches) {
        for (const match of matches) {
          // Additional validation for patterns that have validators
          if (pattern.validator && !pattern.validator(match)) {
            continue;
          }
          
          findings.push({
            type,
            description: pattern.description,
            match: match,
            position: text.indexOf(match),
            context: context.field || 'unknown'
          });
        }
      }
    }
    
    return {
      hasPHI: findings.length > 0,
      findings,
      confidence: this.calculateConfidence(findings, context)
    };
  }

  /**
   * Calculate confidence level of PHI detection
   */
  calculateConfidence(findings, context) {
    if (findings.length === 0) return 0;
    
    let confidence = 0;
    
    for (const finding of findings) {
      switch (finding.type) {
        case 'ssn':
        case 'mrn':
        case 'patientId':
          confidence += 0.9; // High confidence
          break;
        case 'phone':
        case 'dob':
        case 'insurance':
          confidence += 0.7; // Medium confidence
          break;
        case 'email':
        case 'address':
          confidence += 0.5; // Lower confidence (could be business)
          break;
        case 'creditCard':
          confidence += 0.8; // High confidence if validated
          break;
      }
    }
    
    // Adjust based on context
    if (context.source === 'healthcare' || context.source === 'medical') {
      confidence *= 1.2;
    }
    
    return Math.min(confidence / findings.length, 1.0);
  }

  /**
   * Sanitize text by removing/masking PHI
   */
  sanitizeText(text, options = {}) {
    if (!text || typeof text !== 'string') return text;
    
    const { maskChar = '*', preserveLength = true, redactionText = '[REDACTED-PHI]' } = options;
    let sanitizedText = text;
    
    for (const [type, pattern] of Object.entries(this.patterns)) {
      sanitizedText = sanitizedText.replace(pattern.regex, (match) => {
        // Additional validation for patterns that have validators
        if (pattern.validator && !pattern.validator(match)) {
          return match; // Keep original if validation fails
        }
        
        if (preserveLength) {
          return maskChar.repeat(match.length);
        } else {
          return redactionText;
        }
      });
    }
    
    return sanitizedText;
  }

  /**
   * Recursively scan and sanitize object for PHI
   */
  sanitizeObject(obj, options = {}) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const scanResult = this.scanForPHI(value, { field: key });
        
        if (scanResult.hasPHI) {
          sanitized[key] = this.sanitizeText(value, options);
          
          if (this.logViolations) {
            this.logPHIViolation(key, scanResult);
          }
        } else {
          sanitized[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, options);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Express middleware for PHI detection and blocking
   */
  middleware() {
    return (req, res, next) => {
      try {
        // Scan request body for PHI
        if (req.body && typeof req.body === 'object') {
          const scanResult = this.scanObjectForPHI(req.body);
          
          if (scanResult.hasPHI) {
            if (this.logViolations) {
              this.logPHIViolation('request_body', scanResult, req);
            }
            
            if (this.blockOnDetection) {
              return res.status(400).json({
                error: 'Request contains potentially sensitive healthcare information',
                code: 'PHI_DETECTED',
                message: 'Please remove any personal health information and try again'
              });
            } else {
              // Sanitize the request body
              req.body = this.sanitizeObject(req.body);
              req.phiDetected = true;
              req.phiFindings = scanResult.findings;
            }
          }
        }
        
        // Scan query parameters
        if (req.query && typeof req.query === 'object') {
          const scanResult = this.scanObjectForPHI(req.query);
          
          if (scanResult.hasPHI) {
            if (this.blockOnDetection) {
              return res.status(400).json({
                error: 'Query parameters contain potentially sensitive information',
                code: 'PHI_DETECTED_QUERY'
              });
            }
          }
        }
        
        next();
      } catch (error) {
        console.error('PHI detection middleware error:', error);
        next(); // Continue processing on error
      }
    };
  }

  /**
   * Scan object recursively for PHI
   */
  scanObjectForPHI(obj, context = {}) {
    const allFindings = [];
    
    const scan = (item, path = '') => {
      if (typeof item === 'string') {
        const result = this.scanForPHI(item, { field: path });
        allFindings.push(...result.findings);
      } else if (typeof item === 'object' && item !== null) {
        for (const [key, value] of Object.entries(item)) {
          scan(value, path ? `${path}.${key}` : key);
        }
      }
    };
    
    scan(obj);
    
    return {
      hasPHI: allFindings.length > 0,
      findings: allFindings,
      confidence: this.calculateConfidence(allFindings, context)
    };
  }

  /**
   * Log PHI violation for audit trail
   */
  logPHIViolation(field, scanResult, req = null) {
    const violation = {
      timestamp: new Date().toISOString(),
      eventType: 'PHI_VIOLATION',
      field,
      findings: scanResult.findings.map(f => ({
        type: f.type,
        description: f.description,
        context: f.context,
        // Don't log the actual match for security
        hasMatch: true
      })),
      confidence: scanResult.confidence,
      source: req ? {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.session?.id,
        userId: req.session?.userId
      } : 'unknown',
      severity: scanResult.confidence > 0.8 ? 'HIGH' : scanResult.confidence > 0.5 ? 'MEDIUM' : 'LOW'
    };
    
    console.log('PHI_VIOLATION:', JSON.stringify(violation));
    
    // TODO: Send to HIPAA compliance monitoring system
  }

  /**
   * Generate PHI detection report
   */
  generateReport(data) {
    const scanResult = this.scanObjectForPHI(data);
    
    return {
      summary: {
        hasPHI: scanResult.hasPHI,
        totalFindings: scanResult.findings.length,
        confidence: scanResult.confidence,
        riskLevel: scanResult.confidence > 0.8 ? 'HIGH' : 
                   scanResult.confidence > 0.5 ? 'MEDIUM' : 'LOW'
      },
      findings: scanResult.findings,
      recommendations: this.generateRecommendations(scanResult),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate recommendations based on findings
   */
  generateRecommendations(scanResult) {
    const recommendations = [];
    
    if (scanResult.hasPHI) {
      recommendations.push('Remove all personal health information before processing');
      recommendations.push('Implement data masking for display purposes');
      recommendations.push('Ensure HIPAA compliance training for all users');
      
      const types = [...new Set(scanResult.findings.map(f => f.type))];
      
      if (types.includes('ssn')) {
        recommendations.push('Never include Social Security Numbers in ticket descriptions');
      }
      
      if (types.includes('mrn') || types.includes('patientId')) {
        recommendations.push('Use generic identifiers instead of medical record numbers');
      }
      
      if (types.includes('dob')) {
        recommendations.push('Replace dates of birth with age ranges if needed');
      }
    }
    
    return recommendations;
  }
}

module.exports = PHIDetector;
