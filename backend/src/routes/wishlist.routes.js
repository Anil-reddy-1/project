const express = require('express');
const router = express.Router();
const wishlistController = require('../controller/wishlistController');
const { authenticate } = require('../middleware/auth');
const { ensureUser } = require('../middleware/ensureUser');
const { validateAddToWishlist } = require('../middleware/productValidation');

/**
 * Wishlist Routes
 * User wishlist management endpoints
 */

// All wishlist routes require authentication and ensure user exists in DB
router.use(authenticate);
router.use(ensureUser);

/**
 * @route   GET /api/v1/wishlist
 * @desc    Get user's wishlist with product details
 * @access  Private
 */
router.get('/', wishlistController.getWishlist);

/**
 * @route   GET /api/v1/wishlist/count
 * @desc    Get wishlist item count
 * @access  Private
 */
router.get('/count', wishlistController.getWishlistCount);

/**
 * @route   GET /api/v1/wishlist/check/:productId
 * @desc    Check if product is in wishlist
 * @access  Private
 */
router.get('/check/:productId', wishlistController.checkWishlist);

/**
 * @route   POST /api/v1/wishlist
 * @desc    Add product to wishlist
 * @access  Private
 * @body    { productId: string }
 */
router.post('/', validateAddToWishlist, wishlistController.addToWishlist);

/**
 * @route   DELETE /api/v1/wishlist/:productId
 * @desc    Remove product from wishlist
 * @access  Private
 */
router.delete('/:productId', wishlistController.removeFromWishlist);

/**
 * @route   DELETE /api/v1/wishlist
 * @desc    Clear entire wishlist
 * @access  Private
 */
router.delete('/', wishlistController.clearWishlist);

module.exports = router;
