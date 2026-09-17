const express = require('express');
const router = express.Router();
const signupController = require('../controller/signupController');
const { validateRequest, schemas } = require('../middleware/validateRequest');
const Joi = require('joi');

/**
 * Public Signup Routes
 * Base path: /api/v1/signup
 * These routes are PUBLIC - no authentication required
 */

// Validation schema for buyer signup
const signupSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  name: Joi.string().min(2).max(255).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name cannot exceed 255 characters',
    'any.required': 'Name is required',
  }),
  phone: Joi.string()
    .pattern(/^[0-9+\-\s()]+$/)
    .optional()
    .allow('', null)
    .messages({
      'string.pattern.base': 'Please provide a valid phone number',
    }),
});

/**
 * POST /signup/buyer - Register as a buyer (PUBLIC)
 * Creates both Firebase user and database entry
 */
router.post('/buyer', validateRequest(signupSchema), signupController.signupBuyer);

/**
 * GET /signup/check-email - Check if email is available (PUBLIC)
 * Query params: email
 */
router.get('/check-email', signupController.checkEmailAvailability);

module.exports = router;
