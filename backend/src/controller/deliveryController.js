const deliveryService = require('../services/deliveryService');
const logger = require('../utils/logger');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/error');

/**
 * Delivery Controller
 * Handles delivery management endpoints
 */

/**
 * Get all deliveries (admin view)
 * GET /api/v1/deliveries
 * Query: page, limit, status, partnerId, dateFrom, dateTo
 */
async function getAllDeliveries(req, res, next) {
  try {
    const { page, limit, status, partnerId, dateFrom, dateTo } = req.query;
    
    const result = await deliveryService.getAllDeliveries({
      page,
      limit,
      status,
      partnerId,
      dateFrom,
      dateTo
    });
    
    res.status(200).json({
      success: true,
      message: 'All deliveries retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get all deliveries error:', {
      error: error.message,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get pending deliveries for assignment (admin view)
 * GET /api/v1/deliveries/pending
 * Query: page, limit
 */
async function getPendingDeliveries(req, res, next) {
  try {
    const { page, limit } = req.query;
    
    const result = await deliveryService.getPendingDeliveries({
      page,
      limit
    });
    
    res.status(200).json({
      success: true,
      message: 'Pending deliveries retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get pending deliveries error:', {
      error: error.message,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get available delivery partners (admin view)
 * GET /api/v1/deliveries/partners/available
 */
async function getAvailablePartners(req, res, next) {
  try {
    const partners = await deliveryService.getAvailablePartners();
    
    res.status(200).json({
      success: true,
      message: 'Available delivery partners retrieved successfully',
      data: {
        partners,
        count: partners.length
      }
    });
  } catch (error) {
    logger.error('Get available partners error:', {
      error: error.message,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get partner's deliveries
 * GET /api/v1/deliveries/me
 * Query: page, limit, status
 */
async function getMyDeliveries(req, res, next) {
  try {
    const partnerId = req.user.dbId;
    const { page, limit, status } = req.query;
    
    const result = await deliveryService.getPartnerDeliveries(partnerId, {
      page,
      limit,
      status
    });
    
    res.status(200).json({
      success: true,
      message: 'Your deliveries retrieved successfully',
      data: result
    });
  } catch (error) {
    logger.error('Get my deliveries error:', {
      error: error.message,
      partnerId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get partner's delivery statistics
 * GET /api/v1/deliveries/stats/me
 */
async function getMyDeliveryStats(req, res, next) {
  try {
    const partnerId = req.user.dbId;
    
    const stats = await deliveryService.getPartnerStatistics(partnerId);
    
    res.status(200).json({
      success: true,
      message: 'Delivery statistics retrieved successfully',
      data: stats
    });
  } catch (error) {
    logger.error('Get delivery stats error:', {
      error: error.message,
      partnerId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get delivery by ID
 * GET /api/v1/deliveries/:id
 */
async function getDeliveryById(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.dbId;
    const userRole = req.user.role;
    
    const delivery = await deliveryService.getDeliveryDetails(id, userId, userRole);
    
    res.status(200).json({
      success: true,
      message: 'Delivery retrieved successfully',
      data: {
        delivery
      }
    });
  } catch (error) {
    logger.error('Get delivery by ID error:', {
      error: error.message,
      deliveryId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Assign delivery to partner (admin only)
 * POST /api/v1/deliveries/:id/assign
 * Body: { partnerId }
 */
async function assignDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const { partnerId } = req.body;
    const adminId = req.user.dbId;
    
    if (!partnerId) {
      throw new BadRequestError('Delivery partner ID is required');
    }
    
    const delivery = await deliveryService.assignDelivery(id, partnerId, adminId);
    
    logger.info('Delivery assigned', {
      deliveryId: id,
      partnerId,
      assignedBy: adminId
    });
    
    res.status(200).json({
      success: true,
      message: 'Delivery assigned successfully',
      data: {
        delivery
      }
    });
  } catch (error) {
    logger.error('Assign delivery error:', {
      error: error.message,
      deliveryId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Accept delivery (delivery partner)
 * POST /api/v1/deliveries/:id/accept
 */
async function acceptDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const partnerId = req.user.dbId;
    
    const delivery = await deliveryService.acceptDelivery(id, partnerId);
    
    logger.info('Delivery accepted', {
      deliveryId: id,
      partnerId
    });
    
    res.status(200).json({
      success: true,
      message: 'Delivery accepted successfully',
      data: {
        delivery
      }
    });
  } catch (error) {
    logger.error('Accept delivery error:', {
      error: error.message,
      deliveryId: req.params.id,
      partnerId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Start delivery (delivery partner)
 * POST /api/v1/deliveries/:id/start
 * Body: { notes? }
 */
async function startDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const partnerId = req.user.dbId;
    
    const delivery = await deliveryService.startDelivery(id, partnerId, notes);
    
    logger.info('Delivery started', {
      deliveryId: id,
      partnerId
    });
    
    res.status(200).json({
      success: true,
      message: 'Delivery started successfully',
      data: {
        delivery
      }
    });
  } catch (error) {
    logger.error('Start delivery error:', {
      error: error.message,
      deliveryId: req.params.id,
      partnerId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Complete delivery (delivery partner)
 * POST /api/v1/deliveries/:id/complete
 * Body: { notes? }
 */
async function completeDelivery(req, res, next) {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const partnerId = req.user.dbId;
    
    const delivery = await deliveryService.completeDelivery(id, partnerId, notes);
    
    logger.info('Delivery completed', {
      deliveryId: id,
      partnerId
    });
    
    res.status(200).json({
      success: true,
      message: 'Delivery completed successfully',
      data: {
        delivery
      }
    });
  } catch (error) {
    logger.error('Complete delivery error:', {
      error: error.message,
      deliveryId: req.params.id,
      partnerId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Update delivery status (generic)
 * PATCH /api/v1/deliveries/:id/status
 * Body: { status, notes? }
 */
async function updateDeliveryStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const userId = req.user.dbId;
    const userRole = req.user.role;
    
    if (!status) {
      throw new BadRequestError('Status is required');
    }
    
    const delivery = await deliveryService.updateDeliveryStatus(
      id,
      status,
      userId,
      userRole,
      notes
    );
    
    logger.info('Delivery status updated', {
      deliveryId: id,
      newStatus: status,
      updatedBy: userId
    });
    
    res.status(200).json({
      success: true,
      message: 'Delivery status updated successfully',
      data: {
        delivery
      }
    });
  } catch (error) {
    logger.error('Update delivery status error:', {
      error: error.message,
      deliveryId: req.params.id,
      userId: req.user?.dbId
    });
    next(error);
  }
}

/**
 * Get delivery by order ID
 * GET /api/v1/deliveries/order/:orderId
 */
async function getDeliveryByOrderId(req, res, next) {
  try {
    const { orderId } = req.params;
    const userId = req.user.dbId;
    const userRole = req.user.role;
    
    const deliveryModel = require('../models/deliveryModel');
    const delivery = await deliveryModel.findDeliveryByOrderId(orderId);
    
    if (!delivery) {
      throw new NotFoundError('Delivery not found for this order', 'Delivery');
    }
    
    // Permission check
    if (userRole !== 'admin' && delivery.deliveryPartnerId !== userId) {
      throw new ForbiddenError('You do not have permission to view this delivery');
    }
    
    // Get status history
    const history = await deliveryModel.getDeliveryStatusHistory(delivery.id);
    
    res.status(200).json({
      success: true,
      message: 'Delivery retrieved successfully',
      data: {
        delivery: {
          ...delivery,
          statusHistory: history
        }
      }
    });
  } catch (error) {
    logger.error('Get delivery by order ID error:', {
      error: error.message,
      orderId: req.params.orderId,
      userId: req.user?.dbId
    });
    next(error);
  }
}

module.exports = {
  getAllDeliveries,
  getPendingDeliveries,
  getAvailablePartners,
  getMyDeliveries,
  getMyDeliveryStats,
  getDeliveryById,
  assignDelivery,
  acceptDelivery,
  startDelivery,
  completeDelivery,
  updateDeliveryStatus,
  getDeliveryByOrderId
};
