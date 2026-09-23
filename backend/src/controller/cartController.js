const cartModel = require('../models/cartModel');
const productModel = require('../models/productModel');
const logger = require('../utils/logger');

/**
 * Cart Controller
 * Handles shopping cart operations
 */

/**
 * Get user's cart with product details
 * GET /api/v1/cart
 */
async function getCart(req, res) {
  try {
    const userId = req.user.dbId;
    
    const cart = await cartModel.getUserCart(userId);
    
    res.status(200).json({
      success: true,
      message: 'Cart retrieved successfully',
      data: {
        items: cart,
        count: cart.reduce((sum, item) => sum + item.quantity, 0),
        itemCount: cart.length
      }
    });
  } catch (error) {
    logger.error('Get cart error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve cart',
      error: error.message
    });
  }
}

/**
 * Add item to cart
 * POST /api/v1/cart
 * Body: { productId, quantity }
 */
async function addToCart(req, res) {
  try {
    const userId = req.user.dbId;
    const { productId, quantity } = req.body;
    
    // Validate input
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be greater than 0'
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
        message: 'Cannot add inactive product to cart'
      });
    }
    
    // Check stock availability (warning only, don't block)
    if (product.quantity === 0) {
      logger.warn('Adding out of stock product to cart:', { productId, userId });
    }
    
    const result = await cartModel.addToCart(userId, productId, quantity);
    
    res.status(201).json({
      success: true,
      message: 'Product added to cart',
      data: result
    });
  } catch (error) {
    logger.error('Add to cart error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to add product to cart',
      error: error.message
    });
  }
}

/**
 * Update cart item quantity
 * PUT /api/v1/cart/:productId
 * Body: { quantity }
 */
async function updateCartItem(req, res) {
  try {
    const userId = req.user.dbId;
    const { productId } = req.params;
    const { quantity } = req.body;
    
    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Quantity is required'
      });
    }
    
    if (quantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'Quantity cannot be negative'
      });
    }
    
    // If quantity is 0, remove item
    if (quantity === 0) {
      return removeFromCart(req, res);
    }
    
    const result = await cartModel.updateCartItem(userId, productId, quantity);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Item not in cart'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Cart item updated',
      data: result
    });
  } catch (error) {
    logger.error('Update cart item error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to update cart item',
      error: error.message
    });
  }
}

/**
 * Remove item from cart
 * DELETE /api/v1/cart/:productId
 */
async function removeFromCart(req, res) {
  try {
    const userId = req.user.dbId;
    const { productId } = req.params;
    
    const result = await cartModel.removeFromCart(userId, productId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Item not in cart'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Item removed from cart',
      data: result
    });
  } catch (error) {
    logger.error('Remove from cart error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to remove item from cart',
      error: error.message
    });
  }
}

/**
 * Clear entire cart
 * DELETE /api/v1/cart
 */
async function clearCart(req, res) {
  try {
    const userId = req.user.dbId;
    
    const result = await cartModel.clearCart(userId);
    
    res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} items from cart`,
      data: result
    });
  } catch (error) {
    logger.error('Clear cart error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to clear cart',
      error: error.message
    });
  }
}

/**
 * Get cart item count
 * GET /api/v1/cart/count
 */
async function getCartCount(req, res) {
  try {
    const userId = req.user.dbId;
    
    const count = await cartModel.getCartCount(userId);
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    logger.error('Get cart count error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to get cart count',
      error: error.message
    });
  }
}

/**
 * Move item to saved for later
 * POST /api/v1/cart/save-for-later/:productId
 */
async function saveForLater(req, res) {
  try {
    const userId = req.user.dbId;
    const { productId } = req.params;
    
    const result = await cartModel.moveToSavedForLater(userId, productId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Item not in cart'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Item saved for later',
      data: result
    });
  } catch (error) {
    logger.error('Save for later error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to save item for later',
      error: error.message
    });
  }
}

/**
 * Get saved for later items
 * GET /api/v1/cart/saved
 */
async function getSavedItems(req, res) {
  try {
    const userId = req.user.dbId;
    
    const savedItems = await cartModel.getSavedItems(userId);
    
    res.status(200).json({
      success: true,
      message: 'Saved items retrieved successfully',
      data: {
        items: savedItems,
        count: savedItems.length
      }
    });
  } catch (error) {
    logger.error('Get saved items error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve saved items',
      error: error.message
    });
  }
}

/**
 * Move saved item back to cart
 * POST /api/v1/cart/move-to-cart/:productId
 */
async function moveToCart(req, res) {
  try {
    const userId = req.user.dbId;
    const { productId } = req.params;
    
    const result = await cartModel.moveToCart(userId, productId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Item not in saved list'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Item moved to cart',
      data: result
    });
  } catch (error) {
    logger.error('Move to cart error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to move item to cart',
      error: error.message
    });
  }
}

/**
 * Remove saved item
 * DELETE /api/v1/cart/saved/:productId
 */
async function removeSavedItem(req, res) {
  try {
    const userId = req.user.dbId;
    const { productId } = req.params;
    
    const result = await cartModel.removeSavedItem(userId, productId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Item not in saved list'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Saved item removed',
      data: result
    });
  } catch (error) {
    logger.error('Remove saved item error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to remove saved item',
      error: error.message
    });
  }
}

/**
 * Move cart item to wishlist
 * POST /api/v1/cart/move-to-wishlist/:productId
 */
async function moveToWishlist(req, res) {
  try {
    const userId = req.user.dbId;
    const { productId } = req.params;
    
    const result = await cartModel.moveToWishlist(userId, productId);
    
    if (result.notFound) {
      return res.status(404).json({
        success: false,
        message: 'Item not in cart'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Item moved to wishlist',
      data: result
    });
  } catch (error) {
    logger.error('Move to wishlist error:', { error: error.message, userId: req.user?.uid });
    res.status(500).json({
      success: false,
      message: 'Failed to move item to wishlist',
      error: error.message
    });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  saveForLater,
  getSavedItems,
  moveToCart,
  removeSavedItem,
  moveToWishlist
};
