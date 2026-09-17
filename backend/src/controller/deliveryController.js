const { success, created, paginated } = require('../utils/response');
const { NotFoundError } = require('../utils/error');
const deliveryModel = require('../models/deliveryModel');
const staffModel = require('../models/staffModel');
const logger = require('../utils/logger');

/**
 * Delivery Management Controller
 */

async function getAllDeliveries(req, res, next) {
  try {
    const { page = 1, limit = 20, status, partnerId } = req.validatedQuery;

    const { deliveries, total } = await deliveryModel.findAllDeliveries({
      page,
      limit,
      status,
      partnerId,
    });

    return paginated(res, {
      data: deliveries.map(delivery => ({
        id: delivery.id,
        orderId: delivery.orderId,
        customer: {
          name: delivery.customerName,
          phone: delivery.customerPhone,
          address: delivery.customerAddress,
        },
        partner: delivery.partnerId ? {
          id: delivery.partnerId,
          name: delivery.partnerName,
        } : null,
        status: delivery.status,
        amount: delivery.amount,
        assignedAt: delivery.assignedAt,
        startedAt: delivery.startedAt,
        completedAt: delivery.completedAt,
      })),
      page,
      limit,
      total,
      message: 'Deliveries retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getDeliveryById(req, res, next) {
  try {
    const { id } = req.params;

    const delivery = await deliveryModel.findDeliveryById(id);
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }

    return success(res, {
      data: {
        id: delivery.id,
        orderId: delivery.orderId,
        customer: {
          name: delivery.customerName,
          phone: delivery.customerPhone,
          address: delivery.customerAddress,
        },
        partner: delivery.partnerId ? {
          id: delivery.partnerId,
          name: delivery.partnerName,
        } : null,
        status: delivery.status,
        amount: delivery.amount,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function assignDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const { partnerId } = req.validatedBody;

    const delivery = await deliveryModel.findDeliveryById(id);
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }

    const partner = await staffModel.findStaffById(partnerId);
    if (!partner) {
      throw new NotFoundError('Delivery partner not found', 'Staff');
    }

    const updated = await deliveryModel.assignDelivery(id, partnerId);

    logger.info(`Delivery assigned: ${id} -> ${partnerId}`);

    return success(res, {
      data: {
        delivery: {
          id: updated.id,
          orderId: updated.orderId,
          partnerId: updated.partnerId,
          status: updated.status,
          assignedAt: updated.assignedAt,
        },
      },
      message: 'Delivery assigned successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function updateDeliveryStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.validatedBody;

    const delivery = await deliveryModel.findDeliveryById(id);
    if (!delivery) {
      throw new NotFoundError('Delivery not found', 'Delivery');
    }

    const updated = await deliveryModel.updateDeliveryStatus(id, status, notes);

    logger.info(`Delivery status updated: ${id} -> ${status}`);

    return success(res, {
      data: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
      message: 'Delivery status updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllDeliveries,
  getDeliveryById,
  assignDelivery,
  updateDeliveryStatus,
};
