const { Server } = require('socket.io');
const { getAuth } = require('./firebase');
const logger = require('../utils/logger');

let io = null;

/**
 * Initialize Socket.IO server
 * @param {import('http').Server} httpServer - Node HTTP server instance
 * @returns {import('socket.io').Server} Socket.IO server instance
 */
function initializeSocket(httpServer) {
  // Build allowed origins (same as Express CORS config)
  const envOrigins = process.env.ALLOWED_ORIGIN
    ? process.env.ALLOWED_ORIGIN.split(',').map(o => o.trim())
    : [];
  const defaultOrigins = ['http://localhost:5173', 'https://ganga-jamuna.vercel.app'];
  const allowedOrigins = [...new Set([...envOrigins, ...defaultOrigins])];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
    transports: ['websocket', 'polling'],
  });

  // ─── Firebase Auth Middleware ─────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const auth = getAuth();
      const decoded = await auth.verifyIdToken(token);
      socket.user = {
        uid: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || null,
      };

      // Resolve database user ID from firebase uid
      const pool = require('./db');
      const result = await pool.query(
        'SELECT id, role FROM users WHERE firebase_uid = $1 LIMIT 1',
        [decoded.uid]
      );
      if (result.rows.length > 0) {
        socket.user.dbId = result.rows[0].id;
        socket.user.role = result.rows[0].role;
      }

      next();
    } catch (err) {
      logger.warn('[Socket.IO] Auth failed:', { error: err.message });
      next(new Error('Authentication failed'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────────
  io.on('connection', (socket) => {
    const { uid, dbId, role, name } = socket.user;
    logger.info(`[Socket.IO] Connected: ${name || uid} (role: ${role})`);

    // Join personal room for targeted notifications
    if (dbId) {
      socket.join(`user:${dbId}`);
    }

    // Join role-based room for broadcasts
    if (role) {
      socket.join(`role:${role}`);
    }

    // Client can request to join order-specific rooms (for live tracking)
    socket.on('join:order', (orderId) => {
      if (orderId) {
        socket.join(`order:${orderId}`);
      }
    });

    socket.on('leave:order', (orderId) => {
      if (orderId) {
        socket.leave(`order:${orderId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.info(`[Socket.IO] Disconnected: ${name || uid} (${reason})`);
    });
  });

  logger.info('[Socket.IO] Initialized successfully');
  return io;
}

/**
 * Get the active Socket.IO server instance
 * @returns {import('socket.io').Server | null}
 */
function getIO() {
  return io;
}

module.exports = { initializeSocket, getIO };
