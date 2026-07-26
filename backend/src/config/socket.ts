import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { adminAuth } from './firebase';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userRole: string;
  userEmail: string;
}

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocketIO(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  console.log('[Socket.io] Server initialized');

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify Firebase token
      const decodedToken = await adminAuth().verifyIdToken(token);
      
      // Attach user info to socket
      (socket as AuthenticatedSocket).userId = decodedToken.uid;
      (socket as AuthenticatedSocket).userRole = decodedToken.role || 'retailer';
      (socket as AuthenticatedSocket).userEmail = decodedToken.email || '';

      console.log(`[Socket.io] User authenticated: ${decodedToken.email} (${decodedToken.role})`);
      next();
    } catch (error) {
      console.error('[Socket.io] Authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const authSocket = socket as AuthenticatedSocket;
    console.log(`[Socket.io] Client connected: ${authSocket.userId} (${authSocket.userRole})`);

    // Join role-specific room
    socket.join(`role:${authSocket.userRole}`);

    // Join user-specific room
    socket.join(`user:${authSocket.userId}`);

    // Handle partner-specific events
    if (authSocket.userRole === 'delivery') {
      handlePartnerConnection(authSocket);
    }

    // Handle wholesaler-specific events
    if (authSocket.userRole === 'wholesaler') {
      handleWholesalerConnection(authSocket);
    }

    // Handle admin-specific events
    if (authSocket.userRole === 'admin') {
      handleAdminConnection(authSocket);
    }

    // Handle retailer-specific events
    if (authSocket.userRole === 'retailer') {
      handleRetailerConnection(authSocket);
    }

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`[Socket.io] Client disconnected: ${authSocket.userId}`);
    });
  });

  return io;
}

/**
 * Get Socket.io server instance
 */
export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketIO first.');
  }
  return io;
}

/**
 * Handle delivery partner connection
 */
function handlePartnerConnection(socket: AuthenticatedSocket) {
  const partnerId = socket.userId;

  // Join partner-specific room
  socket.join(`partner:${partnerId}`);

  // Start location tracking
  socket.on('location:update', (data: { lat: number; lng: number; accuracy: number }) => {
    console.log(`[Socket.io] Location update from partner ${partnerId}:`, data);
    
    // Broadcast to wholesaler and admin
    socket.to('role:wholesaler').emit('location:partner_update', {
      partnerId,
      location: data,
      timestamp: new Date().toISOString(),
    });

    socket.to('role:admin').emit('location:partner_update', {
      partnerId,
      location: data,
      timestamp: new Date().toISOString(),
    });
  });

  // Partner status change
  socket.on('partner:status', (data: { status: 'available' | 'busy' | 'offline' }) => {
    console.log(`[Socket.io] Partner ${partnerId} status: ${data.status}`);
    
    socket.to('role:wholesaler').emit('partner:status_update', {
      partnerId,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
  });

  // Track order
  socket.on('order:track', (data: { orderId: string }) => {
    socket.join(`order:${data.orderId}`);
    console.log(`[Socket.io] Partner ${partnerId} tracking order ${data.orderId}`);
  });

  // Untrack order
  socket.on('order:untrack', (data: { orderId: string }) => {
    socket.leave(`order:${data.orderId}`);
    console.log(`[Socket.io] Partner ${partnerId} stopped tracking order ${data.orderId}`);
  });
}

/**
 * Handle wholesaler connection
 */
function handleWholesalerConnection(socket: AuthenticatedSocket) {
  const wholesalerId = socket.userId;

  // Join wholesaler-specific room
  socket.join(`wholesaler:${wholesalerId}`);

  // Track order
  socket.on('order:track', (data: { orderId: string }) => {
    socket.join(`order:${data.orderId}`);
    console.log(`[Socket.io] Wholesaler ${wholesalerId} tracking order ${data.orderId}`);
  });

  // Untrack order
  socket.on('order:untrack', (data: { orderId: string }) => {
    socket.leave(`order:${data.orderId}`);
  });

  // Request live partners
  socket.on('partners:request_live', () => {
    // This will be handled by a service that queries active partners
    console.log(`[Socket.io] Wholesaler ${wholesalerId} requested live partners`);
  });
}

/**
 * Handle admin connection
 */
function handleAdminConnection(socket: AuthenticatedSocket) {
  const adminId = socket.userId;

  // Join admin room
  socket.join('admin');

  // Track order
  socket.on('order:track', (data: { orderId: string }) => {
    socket.join(`order:${data.orderId}`);
    console.log(`[Socket.io] Admin ${adminId} tracking order ${data.orderId}`);
  });

  // Untrack order
  socket.on('order:untrack', (data: { orderId: string }) => {
    socket.leave(`order:${data.orderId}`);
  });
}

/**
 * Handle retailer connection
 */
function handleRetailerConnection(socket: AuthenticatedSocket) {
  const retailerId = socket.userId;

  // Join retailer-specific room
  socket.join(`retailer:${retailerId}`);

  // Track order
  socket.on('order:track', (data: { orderId: string }) => {
    socket.join(`order:${data.orderId}`);
    console.log(`[Socket.io] Retailer ${retailerId} tracking order ${data.orderId}`);
  });

  // Untrack order
  socket.on('order:untrack', (data: { orderId: string }) => {
    socket.leave(`order:${data.orderId}`);
  });
}

/**
 * Emit event to specific room
 */
export function emitToRoom(room: string, event: string, data: any) {
  if (!io) {
    console.error('[Socket.io] Cannot emit - server not initialized');
    return;
  }
  io.to(room).emit(event, data);
  console.log(`[Socket.io] Emitted ${event} to room ${room}`);
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: any) {
  emitToRoom(`user:${userId}`, event, data);
}

/**
 * Emit event to all users with specific role
 */
export function emitToRole(role: string, event: string, data: any) {
  emitToRoom(`role:${role}`, event, data);
}

/**
 * Emit event to order room (all tracking this order)
 */
export function emitToOrder(orderId: string, event: string, data: any) {
  emitToRoom(`order:${orderId}`, event, data);
}

/**
 * Emit event to partner
 */
export function emitToPartner(partnerId: string, event: string, data: any) {
  emitToRoom(`partner:${partnerId}`, event, data);
}

/**
 * Get connected sockets count
 */
export function getConnectedSocketsCount(): number {
  if (!io) return 0;
  return io.sockets.sockets.size;
}

/**
 * Get sockets in room
 */
export async function getSocketsInRoom(room: string): Promise<number> {
  if (!io) return 0;
  const sockets = await io.in(room).fetchSockets();
  return sockets.length;
}
