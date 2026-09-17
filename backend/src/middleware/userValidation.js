const Joi = require('joi');
const validate = require('./validate');

/**
 * Joi Validation Schemas for User Endpoints
 */

const createUserSchema = Joi.object({
  firebaseUid: Joi.string().trim().required().messages({
    'any.required': 'Firebase UID is required',
  }),
  email: Joi.string().email().trim().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email address is required',
  }),
  name: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'any.required': 'Name is required',
  }),
  phone: Joi.string().trim().allow(null, '').optional(),
  role: Joi.string().valid('student', 'faculty', 'admin').default('student'),
  department: Joi.string().trim().max(100).allow(null, '').optional(),
  avatarUrl: Joi.string().uri().allow(null, '').optional(),
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).optional(),
  phone: Joi.string().trim().allow(null, '').optional(),
  role: Joi.string().valid('student', 'faculty', 'admin').optional(),
  department: Joi.string().trim().max(100).allow(null, '').optional(),
  avatarUrl: Joi.string().uri().allow(null, '').optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

const queryUserSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  role: Joi.string().valid('student', 'faculty', 'admin').optional(),
  search: Joi.string().trim().allow('').optional(),
  isActive: Joi.boolean().optional(),
});

module.exports = {
  validateCreateUser: validate(createUserSchema, 'body'),
  validateUpdateUser: validate(updateUserSchema, 'body'),
  validateQueryUser: validate(queryUserSchema, 'query'),
};
