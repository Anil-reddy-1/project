const express = require('express');
const router = express.Router();
const deliveryController = require('../controller/deliveryController');
const { authenticate, requireRole } = require('../middleware/auth');
const { ensureUser } = require('../middleware/ensureUser');
const validate = require('../middleware/validate');
const {
  assignDeliverySchema,
  updateDeliveryStatusSchema,
  deliveryQuerySchema
} = require('../validation/deliveryValidation');

/**
 * Delivery Routes
 * Delivery management and tracking endpoints
 */

// All delivery routes require authentication and ensure user exists in DB
router.use(authenticate);
router.use(ensureUser);

/**
 * @route   GET /api/v1/deliveries/partners/available
 * @desc    Get available delivery partners (admin only)
 * @access  Private (admin)
 */
router.get('/partners/available', requireRole('admin'), deliveryController.getAvailablePartners);

/**
 * @route   GET /api/v1/deliveries/pending
 * @desc    Get pending deliveries for assignment (admin only)
 * @access  Private (admin)
 * @query   { page, limit }
 */
router.get('/pending', requireRole('admin'), deliveryController.getPendingDeliveries);

/**
 * @route   GET /api/v1/deliveries/stats/me
 * @desc    Get delivery statistics for current partner
 * @access  Private (delivery partner)
 */
router.get('/stats/me', requireRole('delivery'), deliveryController.getMyDeliveryStats);

/**
 * @route   GET /api/v1/deliveries/me
 * @desc    Get current partner's deliveries
 * @access  Private (delivery partner)
 * @query   { page, limit, status }
 */
router.get('/me', requireRole('delivery'), deliveryController.getMyDeliveries);

/**
 * @route   GET /api/v1/deliveries/order/:orderId
 * @desc    Get delivery by order ID
 * @access  Private (admin or assigned partner)
 */
router.get('/order/:orderId', deliveryController.getDeliveryByOrderId);

/**
 * @route   GET /api/v1/deliveries/:id
 * @desc    Get delivery by ID
 * @access  Private (admin or assigned partner)
 */
router.get('/:id', deliveryController.getDeliveryById);

/**
 * @route   GET /api/v1/deliveries
 * @desc    Get all deliveries (admin only)
 * @access  Private (admin)
 * @query   { page, limit, status, partnerId, dateFrom, dateTo }
 */
router.get('/', requireRole('admin'), deliveryController.getAllDeliveries);

/**
 * @route   POST /api/v1/deliveries/:id/assign
 * @desc    Assign delivery to a partner (admin only)
 * @access  Private (admin)
 * @body    { partnerId: string }
 */
router.post('/:id/assign', requireRole('admin'), validate(assignDeliverySchema), deliveryController.assignDelivery);

/**
 * @route   POST /api/v1/deliveries/:id/accept
 * @desc    Accept delivery assignment (delivery partner)
 * @access  Private (delivery partner)
 */
router.post('/:id/accept', requireRole('delivery'), validate(updateDeliveryStatusSchema), deliveryController.acceptDelivery);

/**
 * @route   POST /api/v1/deliveries/:id/start
 * @desc    Start delivery (mark as in transit)
 * @access  Private (delivery partner)
 * @body    { notes?: string }
 */
router.post('/:id/start', requireRole('delivery'), validate(updateDeliveryStatusSchema), deliveryController.startDelivery);

/**
 * @route   POST /api/v1/deliveries/:id/complete
 * @desc    Complete delivery (mark as delivered)
 * @access  Private (delivery partner)
 * @body    { notes?: string }
 */
router.post('/:id/complete', requireRole('delivery'), validate(updateDeliveryStatusSchema), deliveryController.completeDelivery);

/**
 * @route   PATCH /api/v1/deliveries/:id/status
 * @desc    Update delivery status (generic)
 * @access  Private (admin can update any, partner can update own)
 * @body    { status: string, notes?: string }
 */
router.patch('/:id/status', deliveryController.updateDeliveryStatus);

module.exports = router;
