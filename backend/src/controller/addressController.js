const addressModel = require('../models/addressModel');
const logger = require('../utils/logger');

/**
 * Address Controller
 * Handles user delivery address management
 */

/**
 * Get all user addresses
 * GET /api/v1/addresses
 */
async function getAddresses(req, res) {
  try {
    const userId = req.user.dbId;
    
    const addresses = await addressModel.getUserAddresses(userId);
    
    res.status(200).json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: {
        addresses,
        count: addresses.length
      }
    });
  } catch (error) {
    logger.error('Get addresses error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve addresses',
      error: error.message
    });
  }
}

/**
 * Get a specific address
 * GET /api/v1/addresses/:id
 */
async function getAddressById(req, res) {
  try {
    const userId = req.user.dbId;
    const { id } = req.params;
    
    const address = await addressModel.getAddressById(id, userId);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Address retrieved successfully',
      data: address
    });
  } catch (error) {
    logger.error('Get address by ID error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve address',
      error: error.message
    });
  }
}

/**
 * Get default address
 * GET /api/v1/addresses/default
 */
async function getDefaultAddress(req, res) {
  try {
    const userId = req.user.dbId;
    
    const address = await addressModel.getDefaultAddress(userId);
    
    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'No default address found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Default address retrieved successfully',
      data: address
    });
  } catch (error) {
    logger.error('Get default address error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve default address',
      error: error.message
    });
  }
}

/**
 * Create a new address
 * POST /api/v1/addresses
 * Body: { 
 *   name, phone, addressLine1, addressLine2?, city, state, postalCode, 
 *   isDefault?, latitude?, longitude?, imageUrl? 
 * }
 * Note: Upload shop/location image to /api/v1/uploads/image with folder='addresses' first,
 *       then use the returned URL as imageUrl
 */
async function createAddress(req, res) {
  try {
    const userId = req.user.dbId;
    const addressData = req.body;
    
    // Validate address data
    const validationErrors = addressModel.validateAddressData(addressData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    const address = await addressModel.createAddress(userId, addressData);
    
    res.status(201).json({
      success: true,
      message: 'Address created successfully',
      data: address
    });
  } catch (error) {
    logger.error('Create address error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to create address',
      error: error.message
    });
  }
}

/**
 * Update an address
 * PUT /api/v1/addresses/:id
 * Body: { 
 *   name?, phone?, addressLine1?, addressLine2?, city?, state?, postalCode?, 
 *   isDefault?, latitude?, longitude?, imageUrl? 
 * }
 * Note: Upload shop/location image to /api/v1/uploads/image with folder='addresses' first,
 *       then use the returned URL as imageUrl
 */
async function updateAddress(req, res) {
  try {
    const userId = req.user.dbId;
    const { id } = req.params;
    const addressData = req.body;
    
    // Validate if any fields are provided
    if (Object.keys(addressData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }
    
    // Partial validation - only validate provided fields
    const fieldsToValidate = {};
    const validatableFields = ['name', 'phone', 'addressLine1', 'city', 'state', 'postalCode'];
    
    validatableFields.forEach(field => {
      if (addressData[field] !== undefined) {
        fieldsToValidate[field] = addressData[field];
      }
    });
    
    // Only validate if there are validatable fields
    if (Object.keys(fieldsToValidate).length > 0) {
      const validationErrors = addressModel.validateAddressData({
        ...fieldsToValidate,
        // Provide dummy values for required fields not being updated
        name: fieldsToValidate.name || 'dummy',
        phone: fieldsToValidate.phone || '1234567890',
        addressLine1: fieldsToValidate.addressLine1 || 'dummy',
        city: fieldsToValidate.city || 'dummy',
        state: fieldsToValidate.state || 'dummy',
        postalCode: fieldsToValidate.postalCode || '123456'
      });
      
      // Filter out errors for fields that weren't provided
      const relevantErrors = validationErrors.filter(error => {
        return validatableFields.some(field => 
          fieldsToValidate[field] && error.toLowerCase().includes(field.toLowerCase())
        );
      });
      
      if (relevantErrors.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: relevantErrors
        });
      }
    }
    
    const result = await addressModel.updateAddress(id, userId, addressData);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Update address error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message
    });
  }
}

/**
 * Set address as default
 * PATCH /api/v1/addresses/:id/default
 */
async function setDefaultAddress(req, res) {
  try {
    const userId = req.user.dbId;
    const { id } = req.params;
    
    const result = await addressModel.setDefaultAddress(id, userId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: result
    });
  } catch (error) {
    logger.error('Set default address error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      error: error.message
    });
  }
}

/**
 * Delete an address
 * DELETE /api/v1/addresses/:id
 */
async function deleteAddress(req, res) {
  try {
    const userId = req.user.dbId;
    const { id } = req.params;
    
    const result = await addressModel.deleteAddress(id, userId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Address deleted successfully',
      data: result
    });
  } catch (error) {
    logger.error('Delete address error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message
    });
  }
}

/**
 * Get address count
 * GET /api/v1/addresses/count
 */
async function getAddressCount(req, res) {
  try {
    const userId = req.user.dbId;
    
    const count = await addressModel.getAddressCount(userId);
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Get address count error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to get address count',
      error: error.message
    });
  }
}

module.exports = {
  getAddresses,
  getAddressById,
  getDefaultAddress,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  getAddressCount
};
