const Joi = require('joi');
const { ValidationError } = require('../utils/error');
const logger = require('../utils/logger');

/**
 * Validation Middleware Factory
 * Creates a middleware that validates request body against a Joi schema
 */
function validateRequest(schema, options = {}) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      ...options,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type,
      }));

      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors,
      });

      return next(new ValidationError('Validation failed', errors));
    }

    req.validatedBody = value;
    return next();
  };
}

/**
 * Common validation schemas
 */
const schemas = {
  // Authentication
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  // User Management
  createUser: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).optional(),
    role: Joi.string().valid('admin', 'buyer', 'delivery', 'supervisor').required(),
    status: Joi.string().valid('active', 'inactive').default('active'),
  }),

  updateUser: Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    email: Joi.string().email().optional(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).allow('', null).optional(),
    role: Joi.string().valid('admin', 'buyer', 'delivery', 'supervisor').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
  }).min(1),

  // Staff Management
  createStaff: Joi.object({
    name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
    role: Joi.string().valid('manager', 'seller', 'delivery_partner', 'supervisor').required(),
    status: Joi.string().valid('active', 'inactive').default('active'),
  }),

  updateStaffAvailability: Joi.object({
    availability: Joi.string().valid('available', 'busy', 'offline').required(),
  }),

  // Stock Management
  createStock: Joi.object({
    sku: Joi.string().max(100).required(),
    name: Joi.string().min(2).max(255).required(),
    category: Joi.string().max(100).optional(),
    quantity: Joi.number().integer().min(0).required(),
    unit: Joi.string().max(50).required(),
    minStock: Joi.number().integer().min(0).optional(),
    maxStock: Joi.number().integer().min(0).optional(),
    price: Joi.number().positive().precision(2).optional(),
  }),

  adjustStock: Joi.object({
    productId: Joi.string().uuid().required(),
    type: Joi.string().valid('add', 'subtract').required(),
    quantity: Joi.number().integer().positive().required(),
    reason: Joi.string().max(255).required(),
    notes: Joi.string().optional(),
  }),

  // Pricing Management
  updatePrice: Joi.object({
    newPrice: Joi.number().positive().precision(2).required(),
    reason: Joi.string().max(255).optional(),
    effectiveDate: Joi.date().iso().optional(),
  }),

  // Order Management
  createOrder: Joi.object({
    customerId: Joi.string().uuid().optional(),
    customerName: Joi.string().min(2).max(255).required(),
    customerEmail: Joi.string().email().required(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().positive().required(),
        })
      )
      .min(1)
      .required(),
    deliveryAddress: Joi.object({
      name: Joi.string().max(255).required(),
      phone: Joi.string().pattern(/^[0-9+\-\s()]+$/).required(),
      addressLine: Joi.string().max(255).required(),
      city: Joi.string().max(100).required(),
      state: Joi.string().max(100).required(),
      postalCode: Joi.string().max(20).required(),
    }).required(),
  }),

  updateOrderStatus: Joi.object({
    status: Joi.string().valid('confirmed', 'processing', 'completed', 'cancelled').required(),
    notes: Joi.string().optional(),
  }),

  // Delivery Management
  assignDelivery: Joi.object({
    partnerId: Joi.string().uuid().required(),
  }),

  updateDeliveryStatus: Joi.object({
    status: Joi.string().valid('pending', 'assigned', 'accepted', 'in_transit', 'delivered', 'failed', 'cancelled').required(),
    notes: Joi.string().optional(),
    proofOfDelivery: Joi.string().optional(),
  }),

  // Debt Management
  createDebt: Joi.object({
    description: Joi.string().max(255).required(),
    amount: Joi.number().positive().precision(2).required(),
    dueDate: Joi.date().iso().required(),
    notes: Joi.string().optional(),
  }),

  recordPayment: Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    paymentDate: Joi.date().iso().required(),
    paymentMethod: Joi.string().max(100).required(),
    referenceNumber: Joi.string().max(255).required(),
    notes: Joi.string().optional(),
  }),

  // Reports
  generateReport: Joi.object({
    type: Joi.string().valid('daily_operations', 'sales', 'stock', 'delivery', 'staff_performance', 'debt', 'financial_summary').required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    filters: Joi.object().optional(),
  }),

  quickAnalytics: Joi.object({
    type: Joi.string().valid('daily_operations', 'sales', 'stock', 'delivery', 'staff_performance', 'debt', 'financial_summary').required(),
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    filters: Joi.object().optional(),
  }),

  // Scheduled Reports
  createScheduledReport: Joi.object({
    title: Joi.string().min(3).max(255).required(),
    reportType: Joi.string().valid('daily_operations', 'sales', 'stock', 'delivery', 'staff_performance', 'debt', 'financial_summary').required(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
    filters: Joi.object().optional(),
  }),

  updateScheduledReport: Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
    filters: Joi.object().optional(),
    isActive: Joi.boolean().optional(),
  }).min(1),
};

/**
 * Query parameter validation
 */
function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Query validation failed', {
        path: req.path,
        errors,
      });

      return next(new ValidationError('Invalid query parameters', errors));
    }

    req.validatedQuery = value;
    return next();
  };
}

// Common query schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  search: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
  }),

  userFilter: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
    role: Joi.string().valid('admin', 'buyer', 'delivery', 'supervisor').optional(),
    status: Joi.string().valid('active', 'inactive').optional(),
  }),

  staffFilter: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().optional(),
    status: Joi.string().optional(),
    availability: Joi.string().optional(),
  }),

  stockFilter: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    search: Joi.string().optional(),
    status: Joi.string().optional(),
    category: Joi.string().optional(),
  }),

  deliveryFilter: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().optional(),
    partnerId: Joi.string().uuid().optional(),
  }),

  debtFilter: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().optional(),
    overdue: Joi.boolean().default(false),
  }),

  orderFilter: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().optional(),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().optional(),
  }),

  reportFilter: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    type: Joi.string().valid('daily_operations', 'sales', 'stock', 'delivery', 'staff_performance', 'debt', 'financial_summary').optional(),
    status: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    sortBy: Joi.string().valid('created_at', 'title', 'type', 'status').default('created_at'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('DESC'),
  }),
};

module.exports = {
  validateRequest,
  validateQuery,
  schemas,
  querySchemas,
};
