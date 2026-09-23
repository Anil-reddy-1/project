const Joi = require('joi');

/**
 * Order Validation Schemas
 * Comprehensive input validation for order operations
 */

// Create order validation
const createOrderSchema = Joi.object({
  addressId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid address ID format',
    'any.required': 'Delivery address is required'
  }),
  paymentMethod: Joi.string().valid('COD', 'CARD', 'UPI').default('COD'),
  notes: Joi.string().max(500).allow('', null).messages({
    'string.max': 'Notes cannot exceed 500 characters'
  })
});

// Validate order schema
const validateOrderSchema = Joi.object({
  addressId: Joi.string().uuid().required()
});

// Update order status schema
const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'assigned', 'delivered', 'completed', 'cancelled')
    .required()
    .messages({
      'any.only': 'Invalid order status. Valid values: pending, confirmed, assigned, delivered, completed, cancelled',
      'any.required': 'Status is required'
    }),
  notes: Joi.string().max(500).allow('', null)
});

// Cancel order schema
const cancelOrderSchema = Joi.object({
  reason: Joi.string().max(500).required().messages({
    'any.required': 'Cancellation reason is required',
    'string.max': 'Reason cannot exceed 500 characters'
  })
});

// Query parameters validation
const orderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'confirmed', 'assigned', 'delivered', 'completed', 'cancelled'),
  paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).messages({
    'date.min': 'End date must be after start date'
  }),
  search: Joi.string().max(100)
});

module.exports = {
  createOrderSchema,
  validateOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema
};
