/**
 * Standardized API response utilities
 * Ensures consistent response format across all endpoints
 */

/**
 * Send a successful response
 * @param {Response} res - Express response object
 * @param {Object} options - Response options
 * @param {*} options.data - Response data
 * @param {string} options.message - Success message
 * @param {number} options.statusCode - HTTP status code (default: 200)
 * @param {Object} options.meta - Additional metadata (pagination, etc.)
 */
function success(
  res,
  { data = null, message = "Success", statusCode = 200, meta = null } = {},
) {
  const response = {
    success: true,
    message,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
function created(
  res,
  { data = null, message = "Resource created successfully" } = {},
) {
  return success(res, { data, message, statusCode: 201 });
}

/**
 * Send a no content response (204)
 */
function noContent(res) {
  return res.status(204).send();
}

/**
 * Send an error response
 * @param {Response} res - Express response object
 * @param {Object} options - Error options
 * @param {string} options.message - Error message
 * @param {number} options.statusCode - HTTP status code (default: 500)
 * @param {string} options.code - Error code for client handling
 * @param {Object} options.errors - Validation errors or additional details
 */
function error(
  res,
  {
    message = "Internal server error",
    statusCode = 500,
    code = "INTERNAL_ERROR",
    errors = null,
  } = {},
) {
  const response = {
    success: false,
    error: {
      code,
      message,
    },
  };

  if (errors) {
    response.error.details = errors;
  }

  return res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 * @param {Response} res - Express response object
 * @param {Object} options - Pagination options
 * @param {Array} options.data - Array of items
 * @param {number} options.page - Current page number
 * @param {number} options.limit - Items per page
 * @param {number} options.total - Total number of items
 */
function paginated(
  res,
  { data, page, limit, total, message = "Success" } = {},
) {
  const totalPages = Math.ceil(total / limit);

  return success(res, {
    data,
    message,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  });
}

module.exports = {
  success,
  created,
  noContent,
  error,
  paginated,
};
