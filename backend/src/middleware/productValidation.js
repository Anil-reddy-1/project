const Joi = require('joi');

/**
 * Product Validation Schemas
 * Request body validation for product endpoints
 */

/**
 * Validate product creation
 */
const createProductSchema = Joi.object({
  sku: Joi.string().trim().min(1).max(100).required()
    .messages({
      'string.empty': 'SKU is required',
      'string.max': 'SKU must be at most 100 characters'
    }),
  
  name: Joi.string().trim().min(1).max(255).required()
    .messages({
      'string.empty': 'Product name is required',
      'string.max': 'Product name must be at most 255 characters'
    }),
  
  description: Joi.string().trim().allow('', null).max(5000)
    .messages({
      'string.max': 'Description must be at most 5000 characters'
    }),
  
  categoryTags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ).optional(),
  
  quantity: Joi.number().integer().min(0).default(0)
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative'
    }),
  
  unit: Joi.string().trim().max(50).default('unit')
    .messages({
      'string.max': 'Unit must be at most 50 characters'
    }),
  
  minStock: Joi.number().integer().min(0).default(0)
    .messages({
      'number.base': 'Min stock must be a number',
      'number.min': 'Min stock cannot be negative'
    }),
  
  maxStock: Joi.number().integer().min(0).allow(null)
    .messages({
      'number.base': 'Max stock must be a number',
      'number.min': 'Max stock cannot be negative'
    }),
  
  minOrderQuantity: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Min order quantity must be a number',
      'number.min': 'Min order quantity must be at least 1'
    }),
  
  price: Joi.number().min(0).required()
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative',
      'any.required': 'Price is required'
    }),
  
  status: Joi.string().valid('active', 'inactive').default('active')
    .messages({
      'any.only': 'Status must be either active or inactive'
    })
}).options({ stripUnknown: true });

/**
 * Validate product update
 */
const updateProductSchema = Joi.object({
  name: Joi.string().trim().min(1).max(255)
    .messages({
      'string.empty': 'Product name cannot be empty',
      'string.max': 'Product name must be at most 255 characters'
    }),
  
  description: Joi.string().trim().allow('', null).max(5000)
    .messages({
      'string.max': 'Description must be at most 5000 characters'
    }),
  
  categoryTags: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim()),
    Joi.string()
  ).optional(),
  
  quantity: Joi.number().integer().min(0)
    .messages({
      'number.base': 'Quantity must be a number',
      'number.min': 'Quantity cannot be negative'
    }),
  
  unit: Joi.string().trim().max(50)
    .messages({
      'string.max': 'Unit must be at most 50 characters'
    }),
  
  minStock: Joi.number().integer().min(0)
    .messages({
      'number.base': 'Min stock must be a number',
      'number.min': 'Min stock cannot be negative'
    }),
  
  maxStock: Joi.number().integer().min(0).allow(null)
    .messages({
      'number.base': 'Max stock must be a number',
      'number.min': 'Max stock cannot be negative'
    }),
  
  minOrderQuantity: Joi.number().integer().min(1)
    .messages({
      'number.base': 'Min order quantity must be a number',
      'number.min': 'Min order quantity must be at least 1'
    }),
  
  price: Joi.number().min(0)
    .messages({
      'number.base': 'Price must be a number',
      'number.min': 'Price cannot be negative'
    }),
  
  status: Joi.string().valid('active', 'inactive')
    .messages({
      'any.only': 'Status must be either active or inactive'
    })
}).min(1).options({ stripUnknown: true })
  .messages({
    'object.min': 'At least one field must be provided for update'
  });

/**
 * Validate bulk status update
 */
const bulkStatusSchema = Joi.object({
  productIds: Joi.array().items(Joi.string().uuid()).min(1).required()
    .messages({
      'array.base': 'Product IDs must be an array',
      'array.min': 'At least one product ID is required',
      'any.required': 'Product IDs are required'
    }),
  
  status: Joi.string().valid('active', 'inactive').required()
    .messages({
      'any.only': 'Status must be either active or inactive',
      'any.required': 'Status is required'
    })
}).options({ stripUnknown: true });

/**
 * Validate image reorder
 */
const reorderImagesSchema = Joi.object({
  imageOrder: Joi.array().items(
    Joi.object({
      id: Joi.string().uuid().required(),
      displayOrder: Joi.number().integer().min(0).required()
    })
  ).min(1).required()
    .messages({
      'array.min': 'At least one image must be provided',
      'any.required': 'Image order array is required'
    })
}).options({ stripUnknown: true });

/**
 * Validate wishlist add
 */
const addToWishlistSchema = Joi.object({
  productId: Joi.string().uuid().required()
    .messages({
      'string.guid': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    })
}).options({ stripUnknown: true });

/**
 * Validation middleware factory
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
}

module.exports = {
  validateCreateProduct: validate(createProductSchema),
  validateUpdateProduct: validate(updateProductSchema),
  validateBulkStatus: validate(bulkStatusSchema),
  validateReorderImages: validate(reorderImagesSchema),
  validateAddToWishlist: validate(addToWishlistSchema)
};
