/**
 * JQL Utility functions with security enhancements
 * Prevents JQL injection attacks by properly escaping user input
 */

/**
 * Escapes special characters in JQL string values
 * @param {string} value - The value to escape
 * @returns {string} - Escaped value safe for JQL
 */
function escapeJQLString(value) {
  if (typeof value !== 'string') {
    throw new Error('JQL value must be a string');
  }
  
  // Escape quotes and backslashes
  return value
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')    // Escape double quotes
    .replace(/'/g, "\\'");   // Escape single quotes
}

/**
 * Validates email format for JQL queries
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254; // RFC 5321 limit
}

/**
 * Builds safe JQL query for assigned tickets
 * @param {string} userEmail - User email (validated and escaped)
 * @returns {string} - Safe JQL query
 */
function buildAssignedTicketsQuery(userEmail) {
  if (!isValidEmail(userEmail)) {
    throw new Error('Invalid email format for JQL query');
  }
  
  const escapedEmail = escapeJQLString(userEmail);
  return `assignee = "${escapedEmail}" ORDER BY updated DESC`;
}

/**
 * Builds safe JQL query for created tickets
 * @param {string} userEmail - User email (validated and escaped)
 * @returns {string} - Safe JQL query
 */
function buildCreatedTicketsQuery(userEmail) {
  if (!isValidEmail(userEmail)) {
    throw new Error('Invalid email format for JQL query');
  }
  
  const escapedEmail = escapeJQLString(userEmail);
  return `reporter = "${escapedEmail}" ORDER BY created DESC`;
}

/**
 * Validates and limits JQL result parameters
 * @param {object} params - Query parameters
 * @returns {object} - Validated parameters
 */
function validateQueryParams(params = {}) {
  const maxResults = Math.min(Math.max(1, parseInt(params.maxResults) || 50), 100);
  
  const allowedFields = [
    'key', 'summary', 'description', 'status', 'priority', 
    'issuetype', 'assignee', 'reporter', 'created', 'updated', 'project'
  ];
  
  const fields = params.fields || allowedFields.join(',');
  
  return {
    maxResults,
    fields,
    startAt: Math.max(0, parseInt(params.startAt) || 0)
  };
}

module.exports = {
  escapeJQLString,
  isValidEmail,
  buildAssignedTicketsQuery,
  buildCreatedTicketsQuery,
  validateQueryParams
};
