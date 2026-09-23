const express = require('express');
const router = express.Router();
const addressController = require('../controller/addressController');
const { authenticate } = require('../middleware/auth');
const { ensureUser } = require('../middleware/ensureUser');

/**
 * Address Routes
 * User delivery address management endpoints
 */

// All address routes require authentication and ensure user exists in DB
router.use(authenticate);
router.use(ensureUser);

/**
 * @route   GET /api/v1/addresses
 * @desc    Get all user addresses
 * @access  Private
 */
router.get('/', addressController.getAddresses);

/**
 * @route   GET /api/v1/addresses/count
 * @desc    Get address count
 * @access  Private
 */
router.get('/count', addressController.getAddressCount);

/**
 * @route   GET /api/v1/addresses/default
 * @desc    Get default address
 * @access  Private
 */
router.get('/default', addressController.getDefaultAddress);

/**
 * @route   GET /api/v1/addresses/:id
 * @desc    Get specific address
 * @access  Private
 */
router.get('/:id', addressController.getAddressById);

/**
 * @route   POST /api/v1/addresses
 * @desc    Create new address
 * @access  Private
 * @body    { name, phone, addressLine1, addressLine2?, city, state, postalCode, isDefault? }
 */
router.post('/', addressController.createAddress);

/**
 * @route   PUT /api/v1/addresses/:id
 * @desc    Update address (partial update supported)
 * @access  Private
 * @body    { name?, phone?, addressLine1?, addressLine2?, city?, state?, postalCode?, isDefault? }
 */
router.put('/:id', addressController.updateAddress);

/**
 * @route   PATCH /api/v1/addresses/:id/default
 * @desc    Set address as default
 * @access  Private
 */
router.patch('/:id/default', addressController.setDefaultAddress);

/**
 * @route   DELETE /api/v1/addresses/:id
 * @desc    Delete address
 * @access  Private
 */
router.delete('/:id', addressController.deleteAddress);

module.exports = router;
