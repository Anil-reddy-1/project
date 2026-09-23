const express = require('express');
const router = express.Router();
const notificationController = require('../controller/notificationController');
const { authenticate } = require('../middleware/auth');
const { ensureUser } = require('../middleware/ensureUser');

/**
 * Notification Routes
 * User notification management endpoints
 */

// All notification routes require authentication
router.use(authenticate);
router.use(ensureUser);

/**
 * @route   GET /api/v1/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user's notifications
 * @access  Private
 * @query   { page, limit, unreadOnly }
 */
router.get('/', notificationController.getMyNotifications);

/**
 * @route   PATCH /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch('/mark-all-read', notificationController.markAllAsRead);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
