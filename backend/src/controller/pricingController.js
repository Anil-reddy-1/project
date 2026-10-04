const { success, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/error');
const productModel = require('../models/productModel');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');

/**
 * Pricing Management Controller
 */

async function getAllPricing(req, res, next) {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;

    const { products, total } = await productModel.getAllPricingData({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      category,
      status
    });

    // Instead of paginated, the frontend expects { data: { products } } format right now based on api
    // Wait, the frontend api call might expect 'products' inside data
    return success(res, {
      data: {
        products
      },
      message: 'Product pricing retrieved successfully',
      meta: {
        pagination: {
          page: parseInt(page, 10) || 1,
          limit: parseInt(limit, 10) || 20,
          total
        }
      }
    });
  } catch (error) {
    next(error);
  }
}

async function getPricingStats(req, res, next) {
  try {
    const stats = await productModel.getPricingStats();
    return success(res, {
      data: stats,
      message: 'Pricing stats retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function updateProductPrice(req, res, next) {
  try {
    const { id } = req.params;
    const { retailPrice, wholesalePrice, costPrice, reason } = req.validatedBody;
    const changedBy = req.user.uid;

    const product = await productModel.findProductById(id);
    if (!product) {
      throw new NotFoundError('Product not found', 'Product');
    }

    const priceUpdate = await productModel.updateProductPricing(
      id, 
      { retailPrice, wholesalePrice, costPrice }, 
      reason, 
      changedBy
    );

    logger.info(`Product price updated: ${id}`);

    return success(res, {
      data: {
        priceUpdate
      },
      message: 'Product price updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function bulkUpdatePrices(req, res, next) {
  try {
    const { productIds, adjustmentType, adjustmentValue, applyTo, reason } = req.validatedBody;
    const changedBy = req.user.uid;

    const result = await productModel.bulkUpdatePricing(
      productIds, 
      { adjustmentType, adjustmentValue, applyTo, reason }, 
      changedBy
    );

    logger.info(`Bulk price update applied to ${result.updated} products`);

    return success(res, {
      data: result,
      message: 'Bulk price update completed',
    });
  } catch (error) {
    next(error);
  }
}

async function getPriceHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const product = await productModel.findProductById(id);
    if (!product) {
      throw new NotFoundError('Product not found', 'Product');
    }

    const history = await productModel.getPriceHistory(id, parseInt(limit, 10));

    return success(res, {
      data: {
        history,
      },
      message: 'Price history retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function exportPricing(req, res, next) {
  try {
    const { products } = await productModel.getAllPricingData({ limit: 10000 }); // Large limit for export
    
    if (!products || products.length === 0) {
      return res.status(404).send('No data to export');
    }

    const fields = [
      { label: 'SKU', value: 'sku' },
      { label: 'Product Name', value: 'productName' },
      { label: 'Category', value: 'category' },
      { label: 'Retail Price', value: 'retailPrice' },
      { label: 'Wholesale Price', value: 'wholesalePrice' },
      { label: 'Cost Price', value: 'costPrice' },
      { label: 'Margin %', value: 'margin' },
      { label: 'Last Updated', value: 'lastUpdated' },
      { label: 'Updated By', value: 'changedBy' },
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(products);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=pricing-export.csv');
    
    return res.status(200).send(csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllPricing,
  getPricingStats,
  updateProductPrice,
  bulkUpdatePrices,
  getPriceHistory,
  exportPricing
};
