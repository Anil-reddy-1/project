/**
 * Socket.IO Event Emitter Utility
 * Provides simple helpers to emit real-time events to specific users, roles, or rooms.
 */

const { getIO } = require('../config/socket');
const logger = require('./logger');

/**
 * Emit an event to a specific user by their database ID
 */
function emitToUser(userId, event, data) {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Emit an event to all users with a specific role
 */
function emitToRole(role, event, data) {
  const io = getIO();
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
}

/**
 * Emit an event to an order-specific room
 */
function emitToOrder(orderId, event, data) {
  const io = getIO();
  if (!io) return;
  io.to(`order:${orderId}`).emit(event, data);
}

/**
 * Broadcast an event to all connected clients
 */
function broadcastToAll(event, data) {
  const io = getIO();
  if (!io) return;
  io.emit(event, data);
}

module.exports = {
  emitToUser,
  emitToRole,
  emitToOrder,
  broadcastToAll,
};
