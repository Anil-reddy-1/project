const express = require('express');
const router = express.Router();
const productController = require('../controller/productController');
const { authenticate, requireRole } = require('../middleware/auth');
const { uploadMultiple } = require('../middleware/upload');
const {
  validateCreateProduct,
  validateUpdateProduct,
  validateBulkStatus,
  validateReorderImages
} = require('../middleware/productValidation');

/**
 * Product Routes
 * IMPORTANT: Specific routes MUST come before parameterized routes (:id)
 * Order matters in Express routing!
 */

// ============= Admin Routes (MUST come first!) =============

/**
 * @route   GET /api/v1/products/admin/all
 * @desc    Get all products with advanced filtering (admin view)
 * @access  Private - Admin only
 */
router.get('/admin/all', authenticate, requireRole('admin'), productController.getAllProducts);

/**
 * @route   GET /api/v1/products/stats/dashboard
 * @desc    Get product statistics for dashboard
 * @access  Private - Admin only
 */
router.get('/stats/dashboard', authenticate, requireRole('admin'), productController.getProductStats);

/**
 * @route   GET /api/v1/products/alerts/low-stock
 * @desc    Get low stock products (< 10% of max_stock)
 * @access  Private - Admin only
 */
router.get('/alerts/low-stock', authenticate, requireRole('admin'), productController.getLowStockProducts);

/**
 * @route   GET /api/v1/products/export/csv
 * @desc    Export products to CSV
 * @access  Private - Admin only
 */
router.get('/export/csv', authenticate, requireRole('admin'), productController.exportProductsCSV);

/**
 * @route   PATCH /api/v1/products/bulk/status
 * @desc    Bulk update product status
 * @access  Private - Admin only
 */
router.patch(
  '/bulk/status',
  authenticate,
  requireRole('admin'),
  validateBulkStatus,
  productController.bulkUpdateStatus
);

// ============= Public Routes (specific paths) =============

/**
 * @route   GET /api/v1/products/buyer
 * @desc    Get active products (buyer view)
 * @access  Public
 */
router.get('/buyer', productController.getActiveProducts);

/**
 * @route   GET /api/v1/products/categories
 * @desc    Get all category tags
 * @access  Public
 */
router.get('/categories', productController.getCategoryTags);

// ============= Parameterized Routes (MUST come after specific routes) =============

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', productController.getProductById);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product with optional images
 * @access  Private - Admin only
 */
router.post(
  '/',
  authenticate,
  requireRole('admin'),
  uploadMultiple,
  validateCreateProduct,
  productController.createProduct
);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product with optional new images
 * @access  Private - Admin only
 */
router.put(
  '/:id',
  authenticate,
  requireRole('admin'),
  uploadMultiple,
  validateUpdateProduct,
  productController.updateProduct
);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (soft delete - set status to inactive)
 * @access  Private - Admin only
 */
router.delete('/:id', authenticate, requireRole('admin'), productController.deleteProduct);

// ============= Image Management Routes =============

/**
 * @route   DELETE /api/v1/products/:id/images/:imageId
 * @desc    Delete product image
 * @access  Private - Admin only
 */
router.delete(
  '/:id/images/:imageId',
  authenticate,
  requireRole('admin'),
  productController.deleteProductImage
);

/**
 * @route   PATCH /api/v1/products/:id/images/:imageId/primary
 * @desc    Set image as primary
 * @access  Private - Admin only
 */
router.patch(
  '/:id/images/:imageId/primary',
  authenticate,
  requireRole('admin'),
  productController.setPrimaryImage
);

/**
 * @route   PUT /api/v1/products/:id/images/reorder
 * @desc    Reorder product images
 * @access  Private - Admin only
 */
router.put(
  '/:id/images/reorder',
  authenticate,
  requireRole('admin'),
  validateReorderImages,
  productController.reorderImages
);

module.exports = router;
