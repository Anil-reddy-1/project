const Joi = require('joi');

/**
 * Delivery Validation Schemas
 * Comprehensive input validation for delivery operations
 */

// Assign delivery schema
const assignDeliverySchema = Joi.object({
  partnerId: Joi.string().required().messages({ // Changed from deliveryPartnerId to partnerId
    'any.required': 'Delivery partner ID is required',
    'string.empty': 'Delivery partner ID cannot be empty'
  }),
  notes: Joi.string().max(500).allow('', null)
});

// Update delivery status schema
const updateDeliveryStatusSchema = Joi.object({
  notes: Joi.string().max(500).allow('', null),
  otp: Joi.string().length(6).allow('', null)
});

// Delivery query parameters
const deliveryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'assigned', 'accepted', 'in_transit', 'delivered', 'failed'),
  partnerId: Joi.string(),
  dateFrom: Joi.date().iso(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom'))
});

module.exports = {
  assignDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryQuerySchema
};
