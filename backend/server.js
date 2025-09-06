/**
 * Secure Backend Proxy for Jira Dashboard
 * Implements security best practices and handles all Jira API communication
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { body, param, validationResult } = require('express-validator');
require('dotenv').config();

const jiraRoutes = require('./routes/jira');
const authRoutes = require('./routes/auth');
const { sanitizeErrorMessage } = require('./utils/validation');
const SessionManager = require('./middleware/sessionManager');
const AuditLogger = require('./middleware/auditLogger');
const PHIDetector = require('./middleware/phiDetector');
const userService = require('./services/userService');
const azureAdService = require('./services/azureAdService');

const app = express();
const PORT = process.env.PORT || 3001;
const isDevelopment = process.env.NODE_ENV !== 'production';

// Initialize compliance middleware
const sessionManager = new SessionManager({
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 15 * 60 * 1000,
  maxSessionTimeout: parseInt(process.env.MAX_SESSION_TIMEOUT) || 60 * 60 * 1000
});
const auditLogger = new AuditLogger({
  retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 2555,
  encryptLogs: process.env.NODE_ENV === 'production'
});
const phiDetector = new PHIDetector({
  strictMode: process.env.COMPLIANCE_MODE === 'strict',
  blockOnDetection: process.env.PHI_DETECTION_ENABLED === 'true'
});

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || "http://10.0.0.63:3000"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow images from Jira
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://10.0.0.63:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false // We don't use cookies for this API
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compliance middleware
app.use(auditLogger.middleware());
if (process.env.PHI_DETECTION_ENABLED === 'true') {
  app.use(phiDetector.middleware());
}

// Logging middleware
if (isDevelopment) {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    compliance: {
      phiDetection: process.env.PHI_DETECTION_ENABLED === 'true',
      auditLogging: true,
      sessionManagement: true,
      azureAd: azureAdService.getStatus()
    },
    sessions: sessionManager.getSessionStats()
  });
});

// Authentication routes (no session required)
app.use('/auth', authRoutes);

// API routes (session required for most endpoints)
app.use('/api/jira', jiraRoutes);

// Global error handler
app.use((error, req, res, next) => {
  console.error('Server error:', {
    message: error.message,
    stack: isDevelopment ? error.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });
  
  const sanitizedMessage = sanitizeErrorMessage(error, isDevelopment);
  
  res.status(error.status || 500).json({
    error: sanitizedMessage,
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

const server = app.listen(PORT, () => {
  console.log(`🔒 Secure Jira Dashboard Backend running on port ${PORT}`);
  console.log(`🌍 Environment: ${isDevelopment ? 'development' : 'production'}`);
  console.log(`🔗 CORS origin: ${process.env.CORS_ORIGIN || 'http://10.0.0.63:3000'}`);
  
  // Validate required environment variables
  const requiredEnvVars = ['JIRA_BASE_URL', 'JIRA_EMAIL', 'JIRA_API_TOKEN'];
  const missing = requiredEnvVars.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    console.warn('Please check your .env file');
  } else {
    console.log('✅ All required environment variables are set');
  }
});

module.exports = app;
