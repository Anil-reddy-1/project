const wishlistModel = require('../models/wishlistModel');
const productModel = require('../models/productModel');
const logger = require('../utils/logger');

/**
 * Wishlist Controller
 * Handles wishlist operations for buyers
 */

/**
 * Add product to wishlist
 * POST /api/v1/wishlist
 */
async function addToWishlist(req, res) {
  try {
    const userId = req.user.uid; // From authenticate middleware
    const { productId } = req.body;
    
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    // Verify product exists and is active
    const product = await productModel.findProductById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    if (product.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add inactive product to wishlist'
      });
    }
    
    const result = await wishlistModel.addToWishlist(userId, productId);
    
    if (result.alreadyExists) {
      return res.status(200).json({
        success: true,
        message: 'Product already in wishlist',
        data: { alreadyExists: true }
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: result
    });
  } catch (error) {
    logger.error('Add to wishlist error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to add product to wishlist',
      error: error.message
    });
  }
}

/**
 * Remove product from wishlist
 * DELETE /api/v1/wishlist/:productId
 */
async function removeFromWishlist(req, res) {
  try {
    const userId = req.user.uid;
    const { productId } = req.params;
    
    const result = await wishlistModel.removeFromWishlist(userId, productId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Product not in wishlist'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
      data: result
    });
  } catch (error) {
    logger.error('Remove from wishlist error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to remove product from wishlist',
      error: error.message
    });
  }
}

/**
 * Get user's wishlist
 * GET /api/v1/wishlist
 */
async function getWishlist(req, res) {
  try {
    const userId = req.user.uid;
    
    const wishlist = await wishlistModel.getUserWishlist(userId);
    
    res.status(200).json({
      success: true,
      message: 'Wishlist retrieved successfully',
      data: wishlist,
      count: wishlist.length
    });
  } catch (error) {
    logger.error('Get wishlist error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve wishlist',
      error: error.message
    });
  }
}

/**
 * Check if product is in wishlist
 * GET /api/v1/wishlist/check/:productId
 */
async function checkWishlist(req, res) {
  try {
    const userId = req.user.uid;
    const { productId } = req.params;
    
    const isInWishlist = await wishlistModel.isInWishlist(userId, productId);
    
    res.status(200).json({
      success: true,
      data: { isInWishlist }
    });
  } catch (error) {
    logger.error('Check wishlist error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to check wishlist',
      error: error.message
    });
  }
}

/**
 * Get wishlist count
 * GET /api/v1/wishlist/count
 */
async function getWishlistCount(req, res) {
  try {
    const userId = req.user.uid;
    
    const count = await wishlistModel.getWishlistCount(userId);
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Get wishlist count error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to get wishlist count',
      error: error.message
    });
  }
}

/**
 * Clear wishlist
 * DELETE /api/v1/wishlist
 */
async function clearWishlist(req, res) {
  try {
    const userId = req.user.uid;
    
    const result = await wishlistModel.clearWishlist(userId);
    
    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} items from wishlist`,
      data: result
    });
  } catch (error) {
    logger.error('Clear wishlist error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist',
      error: error.message
    });
  }
}

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  checkWishlist,
  getWishlistCount,
  clearWishlist
};
