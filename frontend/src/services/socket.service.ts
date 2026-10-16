/**
 * Socket.IO Client Service
 * Manages the WebSocket connection to the backend with Firebase auth
 */

import { io, Socket } from 'socket.io-client';
import { auth } from '../firebase';

const SOCKET_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api')
  .replace(/\/api\/?$/, ''); // Strip /api suffix — Socket.IO connects to root

let socket: Socket | null = null;

/**
 * Connect to Socket.IO server with current Firebase user's token
 */
export async function connectSocket(): Promise<Socket | null> {
  // If already connected, return existing socket
  if (socket?.connected) return socket;

  const user = auth.currentUser;
  if (!user) {
    console.warn('[Socket] No authenticated user — skipping connection');
    return null;
  }

  try {
    const token = await user.getIdToken();

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    return socket;
  } catch (err) {
    console.error('[Socket] Failed to connect:', err);
    return null;
  }
}

/**
 * Disconnect the socket
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected and cleaned up');
  }
}

/**
 * Get the current socket instance (may be null if not connected)
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Check if socket is currently connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
