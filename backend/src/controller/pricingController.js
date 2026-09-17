const { success, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/error');
const productModel = require('../models/productModel');
const logger = require('../utils/logger');

/**
 * Pricing Management Controller
 */

async function getAllPricing(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;

    const { products, total } = await productModel.findAllProducts({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
    });

    return paginated(res, {
      data: products.map(product => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        currentPrice: product.currentPrice,
        previousPrice: product.previousPrice,
        lastChanged: product.lastChanged,
        changedBy: product.changedBy,
      })),
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      message: 'Product pricing retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function updateProductPrice(req, res, next) {
  try {
    const { id } = req.params;
    const { newPrice, reason } = req.validatedBody;
    const changedBy = req.user.uid;

    const product = await productModel.findProductById(id);
    if (!product) {
      throw new NotFoundError('Product not found', 'Product');
    }

    const priceUpdate = await productModel.updateProductPrice(id, newPrice, reason, changedBy);

    logger.info(`Product price updated: ${id}, ${priceUpdate.previousPrice} -> ${priceUpdate.newPrice}`);

    return success(res, {
      data: {
        priceUpdate: {
          productId: priceUpdate.productId,
          previousPrice: priceUpdate.previousPrice,
          newPrice: priceUpdate.newPrice,
          change: priceUpdate.change,
          changePercentage: priceUpdate.changePercentage,
          updatedBy: priceUpdate.updatedBy,
          timestamp: priceUpdate.timestamp,
        },
      },
      message: 'Product price updated successfully',
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

module.exports = {
  getAllPricing,
  updateProductPrice,
  getPriceHistory,
};
