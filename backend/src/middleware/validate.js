const { ValidationError } = require('../utils/error');

/**
 * Express Request Validation Middleware using Joi
 * 
 * @param {import('joi').ObjectSchema} schema - Joi validation schema
 * @param {'body'|'query'|'params'} property - Request property to validate (default: 'body')
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));
      return next(new ValidationError('Validation failed', details));
    }

    req[property] = value;
    return next();
  };
}

module.exports = validate;
