/**
 * Frontend input validation utilities
 * Provides client-side validation before sending to backend
 */

/**
 * Validates comment input on the frontend
 * @param {string} comment - Comment to validate
 * @returns {object} - {isValid: boolean, error?: string}
 */
export function validateComment(comment) {
  if (!comment || typeof comment !== 'string') {
    return { isValid: false, error: 'Comment must be a string' };
  }
  
  const trimmed = comment.trim();
  
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Comment cannot be empty' };
  }
  
  if (trimmed.length > 2000) {
    return { isValid: false, error: 'Comment too long (max 2000 characters)' };
  }
  
  return { isValid: true };
}

/**
 * Validates search term input
 * @param {string} searchTerm - Search term to validate
 * @returns {object} - {isValid: boolean, error?: string}
 */
export function validateSearchTerm(searchTerm) {
  if (!searchTerm || typeof searchTerm !== 'string') {
    return { isValid: true }; // Empty search is valid
  }
  
  if (searchTerm.length > 100) {
    return { isValid: false, error: 'Search term too long (max 100 characters)' };
  }
  
  return { isValid: true };
}

/**
 * Sanitizes user input for display
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Validates Jira issue key format (basic client-side check)
 * @param {string} issueKey - Issue key to validate
 * @returns {object} - {isValid: boolean, error?: string}
 */
export function validateIssueKey(issueKey) {
  if (!issueKey || typeof issueKey !== 'string') {
    return { isValid: false, error: 'Issue key is required' };
  }
  
  // Basic format check: PROJECT-123
  const issueKeyPattern = /^[A-Z][A-Z0-9]*-[1-9]\d*$/;
  
  if (!issueKeyPattern.test(issueKey)) {
    return { isValid: false, error: 'Invalid issue key format' };
  }
  
  return { isValid: true };
}
