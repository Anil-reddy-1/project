const notificationService = require('../services/notificationService');

/**
 * Get user's notifications
 */
async function getMyNotifications(req, res, next) {
  try {
    const userId = req.user.dbId;
    const { page, limit, unreadOnly } = req.query;
    
    const result = await notificationService.getUserNotifications(userId, {
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 20,
      unreadOnly: unreadOnly === 'true'
    });
    
    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get unread notification count
 */
async function getUnreadCount(req, res, next) {
  try {
    const userId = req.user.dbId;
    const count = await notificationService.getUnreadCount(userId);
    
    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark notification as read
 */
async function markAsRead(req, res, next) {
  try {
    const userId = req.user.dbId;
    const { id } = req.params;
    
    const notification = await notificationService.markAsRead(id, userId);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found or already read'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(req, res, next) {
  try {
    const userId = req.user.dbId;
    const count = await notificationService.markAllAsRead(userId);
    
    res.status(200).json({
      success: true,
      message: `${count} notifications marked as read`,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
