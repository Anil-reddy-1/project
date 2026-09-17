const productModel = require('../models/productModel');
const { 
  uploadMultipleToCloudinary, 
  deleteFromCloudinary,
  extractPublicId 
} = require('../utils/imageUpload');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');

/**
 * Product Controller
 * Handles product CRUD, filtering, bulk operations, and export
 */

/**
 * Get all products with advanced filtering (Admin)
 * GET /api/v1/products/admin
 */
async function getAllProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      categoryTags,
      status,
      priceMin,
      priceMax,
      stockStatus,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    // Parse categoryTags if provided (can be comma-separated or JSON array)
    let parsedCategoryTags = null;
    if (categoryTags) {
      try {
        parsedCategoryTags = typeof categoryTags === 'string' 
          ? (categoryTags.includes(',') ? categoryTags.split(',').map(t => t.trim()) : JSON.parse(categoryTags))
          : categoryTags;
      } catch (e) {
        parsedCategoryTags = [categoryTags];
      }
    }
    
    const filters = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      categoryTags: parsedCategoryTags,
      status,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      stockStatus,
      sortBy,
      sortOrder
    };
    
    const result = await productModel.findAllProducts(filters);
    
    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Get all products error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
}

/**
 * Get active products only (Buyer)
 * GET /api/v1/products/buyer
 */
async function getActiveProducts(req, res) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      categoryTags,
      priceMin,
      priceMax,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;
    
    // Parse categoryTags
    let parsedCategoryTags = null;
    if (categoryTags) {
      try {
        parsedCategoryTags = typeof categoryTags === 'string' 
          ? (categoryTags.includes(',') ? categoryTags.split(',').map(t => t.trim()) : JSON.parse(categoryTags))
          : categoryTags;
      } catch (e) {
        parsedCategoryTags = [categoryTags];
      }
    }
    
    const filters = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      search,
      categoryTags: parsedCategoryTags,
      status: 'active', // Force active only
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      sortBy,
      sortOrder
    };
    
    const result = await productModel.findAllProducts(filters);
    
    res.status(200).json({
      success: true,
      message: 'Products retrieved successfully',
      data: result.items,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error('Get active products error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve products',
      error: error.message
    });
  }
}

/**
 * Get single product by ID
 * GET /api/v1/products/:id
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;
    
    const product = await productModel.findProductById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product retrieved successfully',
      data: product
    });
  } catch (error) {
    logger.error('Get product by ID error:', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product',
      error: error.message
    });
  }
}

/**
 * Create new product with optional images
 * POST /api/v1/products
 */
async function createProduct(req, res) {
  try {
    const productData = req.body;
    
    // Parse categoryTags if it's a string
    if (typeof productData.categoryTags === 'string') {
      try {
        productData.categoryTags = JSON.parse(productData.categoryTags);
      } catch (e) {
        productData.categoryTags = productData.categoryTags.split(',').map(t => t.trim());
      }
    }
    
    // Handle image uploads if files provided
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const fileBuffers = req.files.map(file => file.buffer);
      const uploadResults = await uploadMultipleToCloudinary(fileBuffers, 'products');
      imageUrls = uploadResults;
    }
    
    const product = await productModel.createProduct(productData, imageUrls);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product
    });
  } catch (error) {
    logger.error('Create product error:', { error: error.message });
    
    if (error.code === '23505') { // Unique constraint violation (duplicate SKU)
      return res.status(409).json({
        success: false,
        message: 'Product with this SKU already exists',
        error: 'DUPLICATE_SKU'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
}

/**
 * Update product with optional new images
 * PUT /api/v1/products/:id
 */
async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Parse categoryTags if it's a string
    if (typeof updates.categoryTags === 'string') {
      try {
        updates.categoryTags = JSON.parse(updates.categoryTags);
      } catch (e) {
        updates.categoryTags = updates.categoryTags.split(',').map(t => t.trim());
      }
    }
    
    // Handle new image uploads if files provided
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      const fileBuffers = req.files.map(file => file.buffer);
      const uploadResults = await uploadMultipleToCloudinary(fileBuffers, 'products');
      newImageUrls = uploadResults;
    }
    
    const product = await productModel.updateProduct(id, updates, newImageUrls);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product
    });
  } catch (error) {
    logger.error('Update product error:', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
}

/**
 * Delete product (soft delete)
 * DELETE /api/v1/products/:id
 */
async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    
    const product = await productModel.deleteProduct(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
      data: product
    });
  } catch (error) {
    logger.error('Delete product error:', { error: error.message, id: req.params.id });
    res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
}

/**
 * Bulk update product status
 * PATCH /api/v1/products/bulk/status
 */
async function bulkUpdateStatus(req, res) {
  try {
    const { productIds, status } = req.body;
    
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Product IDs array is required'
      });
    }
    
    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required (active or inactive)'
      });
    }
    
    const updatedProducts = await productModel.bulkUpdateStatus(productIds, status);
    
    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedProducts.length} products`,
      data: updatedProducts
    });
  } catch (error) {
    logger.error('Bulk update status error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update products',
      error: error.message
    });
  }
}

/**
 * Get low stock products
 * GET /api/v1/products/alerts/low-stock
 */
async function getLowStockProducts(req, res) {
  try {
    const products = await productModel.getLowStockProducts();
    
    res.status(200).json({
      success: true,
      message: 'Low stock products retrieved successfully',
      data: products,
      count: products.length
    });
  } catch (error) {
    logger.error('Get low stock products error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve low stock products',
      error: error.message
    });
  }
}

/**
 * Get product statistics
 * GET /api/v1/products/stats
 */
async function getProductStats(req, res) {
  try {
    const stats = await productModel.getProductStats();
    
    res.status(200).json({
      success: true,
      message: 'Product statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Get product stats error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve product statistics',
      error: error.message
    });
  }
}

/**
 * Get all category tags
 * GET /api/v1/products/categories
 */
async function getCategoryTags(req, res) {
  try {
    const tags = await productModel.getAllCategoryTags();
    
    res.status(200).json({
      success: true,
      message: 'Category tags retrieved successfully',
      data: tags
    });
  } catch (error) {
    logger.error('Get category tags error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve category tags',
      error: error.message
    });
  }
}

/**
 * Export products to CSV
 * GET /api/v1/products/export/csv
 */
async function exportProductsCSV(req, res) {
  try {
    // Get filters from query params
    const {
      search,
      categoryTags,
      status,
      priceMin,
      priceMax,
      stockStatus
    } = req.query;
    
    let parsedCategoryTags = null;
    if (categoryTags) {
      try {
        parsedCategoryTags = typeof categoryTags === 'string' 
          ? (categoryTags.includes(',') ? categoryTags.split(',').map(t => t.trim()) : JSON.parse(categoryTags))
          : categoryTags;
      } catch (e) {
        parsedCategoryTags = [categoryTags];
      }
    }
    
    const filters = {
      page: 1,
      limit: 10000, // Export all matching products
      search,
      categoryTags: parsedCategoryTags,
      status,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      stockStatus
    };
    
    const result = await productModel.findAllProducts(filters);
    
    // Format data for CSV
    const csvData = result.items.map(product => ({
      SKU: product.sku,
      Name: product.name,
      Description: product.description || '',
      Categories: Array.isArray(product.categoryTags) ? product.categoryTags.join(', ') : '',
      Quantity: product.quantity,
      Unit: product.unit,
      'Min Stock': product.minStock,
      'Max Stock': product.maxStock,
      'Min Order Qty': product.minOrderQuantity,
      Price: product.price,
      Status: product.status,
      'Stock Status': product.stockStatus,
      'Created At': product.createdAt
    }));
    
    // Convert to CSV
    const parser = new Parser();
    const csv = parser.parse(csvData);
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products-${Date.now()}.csv`);
    
    res.status(200).send(csv);
  } catch (error) {
    logger.error('Export products CSV error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to export products',
      error: error.message
    });
  }
}

/**
 * Delete product image
 * DELETE /api/v1/products/:id/images/:imageId
 */
async function deleteProductImage(req, res) {
  try {
    const { id, imageId } = req.params;
    
    // Get image details first
    const product = await productModel.findProductById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const image = product.images.find(img => img.id === imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Delete from Cloudinary
    if (image.publicId) {
      await deleteFromCloudinary(image.publicId);
    }
    
    // Delete from database
    await productModel.removeProductImage(imageId);
    
    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });
  } catch (error) {
    logger.error('Delete product image error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
}

/**
 * Set primary image
 * PATCH /api/v1/products/:id/images/:imageId/primary
 */
async function setPrimaryImage(req, res) {
  try {
    const { id, imageId } = req.params;
    
    await productModel.setPrimaryImage(id, imageId);
    
    res.status(200).json({
      success: true,
      message: 'Primary image updated successfully'
    });
  } catch (error) {
    logger.error('Set primary image error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to set primary image',
      error: error.message
    });
  }
}

/**
 * Reorder product images
 * PUT /api/v1/products/:id/images/reorder
 */
async function reorderImages(req, res) {
  try {
    const { id } = req.params;
    const { imageOrder } = req.body;
    
    if (!imageOrder || !Array.isArray(imageOrder)) {
      return res.status(400).json({
        success: false,
        message: 'Image order array is required'
      });
    }
    
    await productModel.reorderProductImages(id, imageOrder);
    
    res.status(200).json({
      success: true,
      message: 'Images reordered successfully'
    });
  } catch (error) {
    logger.error('Reorder images error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to reorder images',
      error: error.message
    });
  }
}

module.exports = {
  getAllProducts,
  getActiveProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  bulkUpdateStatus,
  getLowStockProducts,
  getProductStats,
  getCategoryTags,
  exportProductsCSV,
  deleteProductImage,
  setPrimaryImage,
  reorderImages
};
