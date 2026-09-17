const { success, created, paginated } = require('../utils/response');
const { NotFoundError, BadRequestError } = require('../utils/error');
const stockModel = require('../models/stockModel');
const logger = require('../utils/logger');

/**
 * Stock Management Controller
 */

async function getAllStock(req, res, next) {
  try {
    const { page = 1, limit = 20, search, status, category } = req.validatedQuery;

    const { items, total } = await stockModel.findAllStock({
      page,
      limit,
      search,
      status,
      category,
    });

    return paginated(res, {
      data: items.map(item => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minStock: item.minStock,
        maxStock: item.maxStock,
        price: item.price,
        status: item.status,
        lastUpdated: item.lastUpdated,
      })),
      page,
      limit,
      total,
      message: 'Stock items retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getStockById(req, res, next) {
  try {
    const { id } = req.params;

    const stock = await stockModel.findStockById(id);
    if (!stock) {
      throw new NotFoundError('Stock item not found', 'Stock');
    }

    return success(res, {
      data: {
        id: stock.id,
        sku: stock.sku,
        name: stock.name,
        category: stock.category,
        quantity: stock.quantity,
        unit: stock.unit,
        minStock: stock.minStock,
        maxStock: stock.maxStock,
        price: stock.price,
        status: stock.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createStock(req, res, next) {
  try {
    const { sku, name, category, quantity, unit, minStock, maxStock, price } = req.validatedBody;

    const stock = await stockModel.createStock({
      sku,
      name,
      category,
      quantity,
      unit,
      minStock,
      maxStock,
      price,
    });

    logger.info(`Stock item created: ${stock.id}`);

    return created(res, {
      data: {
        id: stock.id,
        sku: stock.sku,
        name: stock.name,
        category: stock.category,
        quantity: stock.quantity,
        unit: stock.unit,
        minStock: stock.minStock,
        maxStock: stock.maxStock,
        price: stock.price,
        status: stock.status,
      },
      message: 'Stock item created successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function adjustStock(req, res, next) {
  try {
    const { productId, type, quantity, reason, notes } = req.validatedBody;
    const performedBy = req.user.uid;

    // Verify product exists
    const stock = await stockModel.findStockById(productId);
    if (!stock) {
      throw new NotFoundError('Stock item not found', 'Stock');
    }

    const adjustment = await stockModel.adjustStock(productId, type, quantity, reason, notes, performedBy);

    logger.info(`Stock adjusted: ${productId}, type=${type}, quantity=${quantity}`);

    return success(res, {
      data: {
        adjustment: {
          id: adjustment.id,
          productId: adjustment.productId,
          type: adjustment.type,
          quantity: adjustment.quantity,
          previousQuantity: adjustment.previousQuantity,
          newQuantity: adjustment.newQuantity,
          reason: adjustment.reason,
          performedBy: adjustment.performedBy,
          timestamp: adjustment.timestamp,
        },
      },
      message: 'Stock adjusted successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getStockHistory(req, res, next) {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const stock = await stockModel.findStockById(id);
    if (!stock) {
      throw new NotFoundError('Stock item not found', 'Stock');
    }

    const history = await stockModel.getStockHistory(id, parseInt(limit, 10));

    return success(res, {
      data: {
        history,
      },
      message: 'Stock history retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllStock,
  getStockById,
  createStock,
  adjustStock,
  getStockHistory,
};
