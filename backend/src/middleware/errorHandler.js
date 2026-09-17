/**
 * Global error handling middleware
 * Catches all errors and formats them consistently across the app.
 */

const logger = require('../utils/logger');
const response = require('../utils/response');
const { AppError, ValidationError } = require('../utils/error');
const config = require('../config/env');

/**
 * Handle 404 - Route not found
 */
function notFoundHandler(req, res, next) {
  return response.error(res, {
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
    code: 'ROUTE_NOT_FOUND',
  });
}

/**
 * Global error handler
 */
function errorHandler(err, req, res, next) {
  // Default error values
  let statusCode = err.statusCode || err.status || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';
  let errors = null;

  // 1. Operational application errors (AppError subclasses)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;

    if (err instanceof ValidationError) {
      errors = err.errors;
    }
  }
  // 2. Joi validation errors
  else if (err.isJoi || (err.name === 'ValidationError' && Array.isArray(err.details))) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    errors = err.details.map((detail) => ({
      field: detail.path ? detail.path.join('.') : detail.context?.key || 'unknown',
      message: detail.message,
    }));
  }
  // 3. Firebase Auth & custom auth errors
  else if (typeof err.code === 'string' && err.code.startsWith('auth/')) {
    statusCode = 401;
    code = err.code;
    message = getAuthErrorMessage(err.code);
  }
  // 4. PostgreSQL Database Errors (pg package)
  else if (err.code && typeof err.code === 'string' && /^\d{2}[A-Z0-9]{3}$/.test(err.code)) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        code = 'DUPLICATE_ENTRY';
        message = 'A record with this value already exists.';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        code = 'FOREIGN_KEY_VIOLATION';
        message = 'Referenced resource does not exist or is in use.';
        break;
      case '22P02': // Invalid input syntax (e.g. invalid UUID format)
        statusCode = 400;
        code = 'INVALID_INPUT_FORMAT';
        message = 'Invalid data format provided.';
        break;
      default:
        statusCode = 400;
        code = 'DATABASE_ERROR';
        message = 'Database operation failed.';
        break;
    }
  }
  // 5. JSON parsing & request payload errors
  else if (err instanceof SyntaxError && (err.status === 400 || err.statusCode === 400) && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Invalid JSON payload in request body';
  }
  // 6. Payload size limit exceeded
  else if (err.type === 'entity.too.large' || err.status === 413) {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request payload size exceeds server limit';
  }

  // Log error context
  const logContext = {
    code,
    statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.uid,
  };

  if (statusCode >= 500) {
    logger.error(err.message || 'Server error', { ...logContext, stack: err.stack });
  } else {
    logger.warn(err.message || 'Client error', logContext);
  }

  // Hide internal error details in production for 500 errors
  if (statusCode === 500 && typeof config.isProduction === 'function' && config.isProduction()) {
    message = 'An unexpected error occurred';
    errors = null;
  }

  return response.error(res, {
    message,
    statusCode,
    code,
    errors,
  });
}

/**
 * Map Firebase auth error codes to user-friendly messages
 */
function getAuthErrorMessage(code) {
  const messages = {
    'auth/id-token-expired': 'Your session has expired. Please sign in again.',
    'auth/id-token-revoked': 'Your session has been revoked. Please sign in again.',
    'auth/invalid-id-token': 'Invalid authentication token.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'User not found.',
  };

  return messages[code] || 'Authentication failed.';
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
