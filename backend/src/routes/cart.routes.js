const express = require('express');
const router = express.Router();
const cartController = require('../controller/cartController');
const { authenticate } = require('../middleware/auth');
const { ensureUser } = require('../middleware/ensureUser');

/**
 * Cart Routes
 * Shopping cart management endpoints
 */

// All cart routes require authentication and ensure user exists in DB
router.use(authenticate);
router.use(ensureUser);

/**
 * @route   GET /api/v1/cart
 * @desc    Get user's cart with full product details
 * @access  Private
 */
router.get('/', cartController.getCart);

/**
 * @route   GET /api/v1/cart/count
 * @desc    Get total cart item count
 * @access  Private
 */
router.get('/count', cartController.getCartCount);

/**
 * @route   GET /api/v1/cart/saved
 * @desc    Get saved for later items
 * @access  Private
 */
router.get('/saved', cartController.getSavedItems);

/**
 * @route   POST /api/v1/cart
 * @desc    Add item to cart
 * @access  Private
 * @body    { productId: string, quantity: number }
 */
router.post('/', cartController.addToCart);

/**
 * @route   PUT /api/v1/cart/:productId
 * @desc    Update cart item quantity
 * @access  Private
 * @body    { quantity: number }
 */
router.put('/:productId', cartController.updateCartItem);

/**
 * @route   DELETE /api/v1/cart/:productId
 * @desc    Remove item from cart
 * @access  Private
 */
router.delete('/:productId', cartController.removeFromCart);

/**
 * @route   DELETE /api/v1/cart
 * @desc    Clear entire cart
 * @access  Private
 */
router.delete('/', cartController.clearCart);

/**
 * @route   POST /api/v1/cart/save-for-later/:productId
 * @desc    Move cart item to saved for later
 * @access  Private
 */
router.post('/save-for-later/:productId', cartController.saveForLater);

/**
 * @route   POST /api/v1/cart/move-to-cart/:productId
 * @desc    Move saved item back to cart
 * @access  Private
 */
router.post('/move-to-cart/:productId', cartController.moveToCart);

/**
 * @route   DELETE /api/v1/cart/saved/:productId
 * @desc    Remove item from saved for later
 * @access  Private
 */
router.delete('/saved/:productId', cartController.removeSavedItem);

/**
 * @route   POST /api/v1/cart/move-to-wishlist/:productId
 * @desc    Move cart item to wishlist
 * @access  Private
 */
router.post('/move-to-wishlist/:productId', cartController.moveToWishlist);

module.exports = router;
