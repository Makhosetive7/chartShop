/**
 * Error handling utilities for backend controllers
 */

/**
 * Extract a human-readable error message from various error types
 * @param {unknown} error - The error to extract a message from
 * @param {string} fallback - Fallback message if no error message can be extracted
 * @returns {string} The error message
 */
export function getErrorMessage(error, fallback = 'Something went wrong.') {
  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message;
  }

  // Handle MongoDB/Mongoose errors with detailed messages
  if (error && typeof error === 'object') {
    // MongoDB duplicate key error
    if (error.code === 11000) {
      return 'This record already exists.';
    }

    // MongoDB validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map(err => err.message);
      return messages.length > 0 ? messages.join(', ') : fallback;
    }

    // General error object with message property
    if (error.message) {
      return error.message;
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for unknown error types
  return fallback;
}

/**
 * Create a standardized error response object
 * @param {string} message - The error message
 * @param {number} status - HTTP status code
 * @param {string} code - Optional error code for client-side handling
 * @returns {Object} Standardized error response
 */
export function createErrorResponse(message, status = 500, code = null) {
  const response = {
    success: false,
    error: message,
    status
  };

  if (code) {
    response.code = code;
  }

  return response;
}

/**
 * Log error with contextual information
 * @param {string} context - Context where the error occurred (e.g., '[notifications]')
 * @param {string} operation - The operation that failed
 * @param {unknown} error - The error object
 */
export function logError(context, operation, error) {
  const message = getErrorMessage(error);
  console.error(`${context} Error in ${operation}:`, {
    error: message,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  });
}