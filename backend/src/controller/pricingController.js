const { success } = require('../utils/response');
const { NotFoundError, ValidationError } = require('../utils/error');
const productModel = require('../models/productModel');
const logger = require('../utils/logger');
const { Parser } = require('json2csv');

/**
 * Pricing Management Controller
 * 
 * 4-Field Pricing Model:
 *   cost_price      → private, admin-only, never sent to buyer
 *   display_price   → MRP / reference price shown with strikethrough
 *   selling_price   → actual buyer-facing price
 *   minimum_margin_percent → floor margin alert threshold
 *
 * Derived on read:
 *   discountAmount  = display_price − selling_price
 *   discountPercent = (display − selling) / display × 100
 *   grossProfit     = selling_price − cost_price
 *   grossMarginPct  = (selling − cost) / selling × 100
 *   markupPercent   = (selling − cost) / cost × 100
 */

/**
 * GET /pricing/stats
 * Dashboard summary: total products, avg margin, products on offer, low-margin products
 */
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

/**
 * GET /pricing
 * All products with their full pricing data (admin view — includes cost_price)
 */
async function getAllPricing(req, res, next) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      status,
      minMargin,
      maxMargin,
      hasDiscount,
    } = req.query;

    const { products, total } = await productModel.getAllPricingData({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      search,
      category,
      status,
      minMargin: minMargin !== undefined ? parseFloat(minMargin) : undefined,
      maxMargin: maxMargin !== undefined ? parseFloat(maxMargin) : undefined,
      hasDiscount,
    });

    return success(res, {
      data: { products },
      message: 'Product pricing retrieved successfully',
      meta: {
        pagination: {
          page: parseInt(page, 10) || 1,
          limit: parseInt(limit, 10) || 20,
          total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /pricing/:id
 * Update cost_price, display_price, selling_price, or minimum_margin_percent for a product.
 * Validates that selling_price ≤ display_price.
 */
async function updateProductPrice(req, res, next) {
  try {
    const { id } = req.params;
    const { costPrice, displayPrice, sellingPrice, minimumMarginPercent, reason } = req.validatedBody;
    const changedBy = req.user.uid;

    const product = await productModel.findProductById(id);
    if (!product) {
      throw new NotFoundError('Product not found', 'Product');
    }

    const priceUpdate = await productModel.updateProductPricing(
      id,
      { costPrice, displayPrice, sellingPrice, minimumMarginPercent },
      reason,
      changedBy
    );

    logger.info(`Product pricing updated: ${id}`, {
      costPrice,
      displayPrice,
      sellingPrice,
      minimumMarginPercent,
      changedBy,
    });

    return success(res, {
      data: { priceUpdate },
      message: 'Product pricing updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /pricing/bulk
 * Bulk adjust display_price and/or selling_price by percentage or flat amount.
 * applyTo: 'selling' | 'display' | 'both'
 */
async function bulkUpdatePrices(req, res, next) {
  try {
    const { productIds, adjustmentType, adjustmentValue, applyTo, reason } = req.validatedBody;
    const changedBy = req.user.uid;

    const result = await productModel.bulkUpdatePricing(
      productIds,
      { adjustmentType, adjustmentValue, applyTo, reason },
      changedBy
    );

    logger.info(`Bulk price update applied to ${result.updated} products`, { changedBy });

    return success(res, {
      data: result,
      message: `Bulk price update completed — ${result.updated} products updated`,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /pricing/:id/history
 * Price change audit log for a product
 */
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
      data: { history },
      message: 'Price history retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /pricing/suggest
 * Given a cost price and target margin %, return the suggested selling price.
 * Formula: sellingPrice = costPrice / (1 − targetMargin)
 */
async function suggestSellingPrice(req, res, next) {
  try {
    const { costPrice, targetMarginPercent } = req.validatedBody;
    const suggested = productModel.suggestSellingPrice(costPrice, targetMarginPercent);

    if (suggested === null) {
      throw new ValidationError('Invalid inputs for selling price suggestion', []);
    }

    return success(res, {
      data: {
        costPrice: parseFloat(costPrice),
        targetMarginPercent: parseFloat(targetMarginPercent),
        suggestedSellingPrice: suggested,
      },
      message: 'Suggested selling price calculated',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /pricing/export
 * Export pricing data as CSV. Cost price is included (admin only).
 */
async function exportPricing(req, res, next) {
  try {
    const { products } = await productModel.getAllPricingData({ limit: 10000 });

    if (!products || products.length === 0) {
      return res.status(404).send('No data to export');
    }

    const fields = [
      { label: 'SKU', value: 'sku' },
      { label: 'Product Name', value: 'productName' },
      { label: 'Category', value: 'category' },
      { label: 'Cost Price (₹)', value: 'costPrice' },
      { label: 'Display Price / MRP (₹)', value: 'displayPrice' },
      { label: 'Selling Price (₹)', value: 'sellingPrice' },
      { label: 'Discount %', value: 'discountPercent' },
      { label: 'Discount Amount (₹)', value: 'discountAmount' },
      { label: 'Gross Profit (₹)', value: 'grossProfit' },
      { label: 'Gross Margin %', value: 'grossMarginPercent' },
      { label: 'Markup %', value: 'markupPercent' },
      { label: 'Min Margin %', value: 'minimumMarginPercent' },
      { label: 'Below Min Margin', value: 'isBelowMinMargin' },
      { label: 'Last Updated', value: 'lastUpdated' },
      { label: 'Changed By', value: 'changedByName' },
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
  exportPricing,
  suggestSellingPrice,
};
