/**
 * Input validation and sanitization utilities
 * Provides comprehensive validation for all user inputs
 */

/**
 * Validates and sanitizes comment text
 * @param {string} comment - Comment text to validate
 * @returns {object} - {isValid: boolean, sanitized: string, error?: string}
 */
function validateComment(comment) {
  if (typeof comment !== 'string') {
    return { isValid: false, error: 'Comment must be a string' };
  }
  
  const trimmed = comment.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Comment cannot be empty' };
  }
  
  if (trimmed.length > 2000) {
    return { isValid: false, error: 'Comment too long (max 2000 characters)' };
  }
  
  // Basic sanitization - remove potentially dangerous patterns
  const sanitized = trimmed
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
  
  return { isValid: true, sanitized };
}

/**
 * Validates Jira issue key format
 * @param {string} issueKey - Issue key to validate (e.g., "PROJ-123")
 * @returns {object} - {isValid: boolean, error?: string}
 */
function validateIssueKey(issueKey) {
  if (typeof issueKey !== 'string') {
    return { isValid: false, error: 'Issue key must be a string' };
  }
  
  // Jira issue key format: PROJECT-NUMBER (e.g., PROJ-123)
  const issueKeyRegex = /^[A-Z][A-Z0-9]*-[1-9][0-9]*$/;
  
  if (!issueKeyRegex.test(issueKey)) {
    return { isValid: false, error: 'Invalid issue key format' };
  }
  
  if (issueKey.length > 50) {
    return { isValid: false, error: 'Issue key too long' };
  }
  
  return { isValid: true };
}

/**
 * Validates search term input
 * @param {string} searchTerm - Search term to validate
 * @returns {object} - {isValid: boolean, sanitized: string, error?: string}
 */
function validateSearchTerm(searchTerm) {
  if (typeof searchTerm !== 'string') {
    return { isValid: false, error: 'Search term must be a string' };
  }
  
  const trimmed = searchTerm.trim();
  
  if (trimmed.length > 100) {
    return { isValid: false, error: 'Search term too long (max 100 characters)' };
  }
  
  // Remove potentially dangerous characters but allow basic search patterns
  const sanitized = trimmed.replace(/[<>&"']/g, '');
  
  return { isValid: true, sanitized };
}

/**
 * Validates transition ID
 * @param {string|number} transitionId - Transition ID to validate
 * @returns {object} - {isValid: boolean, error?: string}
 */
function validateTransitionId(transitionId) {
  const id = parseInt(transitionId);
  
  if (isNaN(id) || id < 1 || id > 99999) {
    return { isValid: false, error: 'Invalid transition ID' };
  }
  
  return { isValid: true, id };
}

/**
 * Sanitizes error messages for user display
 * Prevents information leakage while providing useful feedback
 * @param {Error} error - Original error
 * @param {boolean} includeDetails - Whether to include detailed error info (dev mode)
 * @returns {string} - Safe error message
 */
function sanitizeErrorMessage(error, includeDetails = false) {
  const userFriendlyMessages = {
    'Invalid email format': 'Please check your email address format',
    'Comment too long': 'Comment is too long, please shorten it',
    'Comment cannot be empty': 'Please enter a comment',
    'Invalid issue key format': 'Invalid ticket reference',
    'Network Error': 'Unable to connect to Jira. Please try again later.',
    'Request failed with status code 401': 'Authentication failed. Please check your credentials.',
    'Request failed with status code 403': 'You do not have permission to perform this action.',
    'Request failed with status code 404': 'The requested ticket was not found.',
    'Request failed with status code 429': 'Too many requests. Please wait a moment and try again.'
  };
  
  const errorMessage = error.message || 'Unknown error';
  const userMessage = userFriendlyMessages[errorMessage] || 'An unexpected error occurred. Please try again.';
  
  if (includeDetails) {
    return `${userMessage} (Details: ${errorMessage})`;
  }
  
  return userMessage;
}

module.exports = {
  validateComment,
  validateIssueKey,
  validateSearchTerm,
  validateTransitionId,
  sanitizeErrorMessage
};
