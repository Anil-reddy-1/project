const express = require('express');
const router = express.Router();
const orderController = require('../controller/orderController');
const { authenticate, requireRole } = require('../middleware/auth');
const { ensureUser } = require('../middleware/ensureUser');
const validate = require('../middleware/validate');
const {
  createOrderSchema,
  validateOrderSchema,
  updateOrderStatusSchema,
  cancelOrderSchema,
  orderQuerySchema
} = require('../validation/orderValidation');

/**
 * Order Routes
 * Order management and checkout endpoints
 */

// All order routes require authentication and ensure user exists in DB
router.use(authenticate);
router.use(ensureUser);

/**
 * @route   POST /api/v1/orders/validate
 * @desc    Validate order before placement (check cart, stock, address)
 * @access  Private
 * @body    { addressId: string }
 */
router.post('/validate', validate(validateOrderSchema), orderController.validateOrder);

/**
 * @route   GET /api/v1/orders/stats/me
 * @desc    Get order statistics for current user
 * @access  Private
 */
router.get('/stats/me', orderController.getMyOrderStats);

/**
 * @route   GET /api/v1/orders/me
 * @desc    Get current user's orders
 * @access  Private
 * @query   { page, limit, status, dateFrom, dateTo }
 */
router.get('/me', orderController.getMyOrders);

/**
 * @route   GET /api/v1/orders/number/:orderNumber
 * @desc    Get order by order number
 * @access  Private (buyer can view own, admin/supervisor can view all)
 */
router.get('/number/:orderNumber', orderController.getOrderByNumber);

/**
 * @route   GET /api/v1/orders/:id
 * @desc    Get order by ID
 * @access  Private (buyer can view own, admin/supervisor can view all)
 */
router.get('/:id', orderController.getOrderById);

/**
 * @route   GET /api/v1/orders
 * @desc    Get all orders (admin and supervisor)
 * @access  Private (admin, supervisor)
 * @query   { page, limit, status, paymentStatus, dateFrom, dateTo, search }
 */
router.get('/', requireRole('admin', 'supervisor'), validate(orderQuerySchema, 'query'), orderController.getAllOrders);

/**
 * @route   POST /api/v1/orders
 * @desc    Place a new order from cart
 * @access  Private
 * @body    { addressId: string, paymentMethod?: string, notes?: string }
 */
router.post('/', validate(createOrderSchema), orderController.createOrder);

/**
 * @route   POST /api/v1/orders/:id/prepare
 * @desc    Mark order as preparing (supervisor only)
 * @access  Private (supervisor, admin)
 */
router.post('/:id/prepare', requireRole('admin', 'supervisor'), orderController.markAsPreparing);

/**
 * @route   POST /api/v1/orders/:id/pack
 * @desc    Mark order as packed and generate OTP (supervisor only)
 * @access  Private (supervisor, admin)
 */
router.post('/:id/pack', requireRole('admin', 'supervisor'), orderController.markAsPacked);

/**
 * @route   POST /api/v1/orders/:id/verify-otp
 * @desc    Verify pickup OTP (delivery partner picks up order)
 * @access  Private (delivery, supervisor, admin)
 * @body    { otp: string }
 */
router.post('/:id/verify-otp', requireRole('admin', 'supervisor', 'delivery'), orderController.verifyPickupOtp);

/**
 * @route   PATCH /api/v1/orders/:id/status
 * @desc    Update order status (admin and supervisor)
 * @access  Private (admin, supervisor)
 * @body    { status: string, notes?: string }
 */
router.patch('/:id/status', requireRole('admin', 'supervisor'), validate(updateOrderStatusSchema), orderController.updateOrderStatus);

/**
 * @route   POST /api/v1/orders/:id/cancel
 * @desc    Cancel an order
 * @access  Private (buyer can cancel own, admin can cancel any)
 * @body    { reason: string }
 */
router.post('/:id/cancel', validate(cancelOrderSchema), orderController.cancelOrder);

module.exports = router;
