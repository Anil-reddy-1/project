/**
 * Validation Middleware
 * Validates request body, query, and params against Joi schemas
 */

const { BadRequestError } = require('../utils/error');

/**
 * Validate request data against a Joi schema
 * @param {Object} schema - Joi schema object
 * @param {string} property - Property to validate (body, query, params)
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown properties
      convert: true // Convert types (e.g., string to number)
    });

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
      
      return next(new BadRequestError(errorMessage));
    }

    // Replace request property with validated and sanitized value
    req[property] = value;
    next();
  };
}

module.exports = validate;
