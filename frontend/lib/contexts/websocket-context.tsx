'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/providers/auth-provider';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
  trackOrder: (orderId: string) => void;
  untrackOrder: (orderId: string) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within WebSocketProvider');
  }
  return context;
}

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Initialize socket connection
  useEffect(() => {
    let active = true;

    async function initSocket() {
      if (!user) {
        // Disconnect if user logs out
        if (socket) {
          socket.disconnect();
          setSocket(null);
          setIsConnected(false);
        }
        return;
      }

      try {
        const idToken = await user.getIdToken();
        if (!active) return;

        // Create socket connection
        const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001';
        
        const newSocket = io(socketUrl, {
          auth: {
            token: idToken,
          },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          reconnectionAttempts: maxReconnectAttempts,
        });

        // Connection event handlers
        newSocket.on('connect', () => {
          if (active) {
            console.log('[WebSocket] Connected');
            setIsConnected(true);
            setConnectionError(null);
            reconnectAttempts.current = 0;
          }
        });

        newSocket.on('disconnect', (reason) => {
          if (active) {
            console.log('[WebSocket] Disconnected:', reason);
            setIsConnected(false);
            
            if (reason === 'io server disconnect') {
              // Server disconnected, try to reconnect
              newSocket.connect();
            }
          }
        });

        newSocket.on('connect_error', (error) => {
          if (active) {
            console.error('[WebSocket] Connection error:', error);
            reconnectAttempts.current++;
            
            if (reconnectAttempts.current >= maxReconnectAttempts) {
              setConnectionError('Failed to connect to real-time server. Some features may be unavailable.');
            }
          }
        });

        newSocket.on('error', (error) => {
          if (active) {
            console.error('[WebSocket] Error:', error);
            setConnectionError(error.message || 'WebSocket error occurred');
          }
        });

        if (active) {
          setSocket(newSocket);
        } else {
          newSocket.disconnect();
        }
      } catch (error) {
        console.error('Error fetching ID token for WebSocket:', error);
      }
    }

    initSocket();

    // Cleanup on unmount
    return () => {
      active = false;
      console.log('[WebSocket] Cleaning up connection');
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Emit event
  const emit = useCallback((event: string, data?: any) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    } else {
      console.warn('[WebSocket] Cannot emit - not connected');
    }
  }, [socket, isConnected]);

  // Subscribe to event
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  // Unsubscribe from event
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }, [socket]);

  // Track order (join order room)
  const trackOrder = useCallback((orderId: string) => {
    emit('order:track', { orderId });
  }, [emit]);

  // Untrack order (leave order room)
  const untrackOrder = useCallback((orderId: string) => {
    emit('order:untrack', { orderId });
  }, [emit]);

  const value: WebSocketContextType = {
    socket,
    isConnected,
    connectionError,
    emit,
    on,
    off,
    trackOrder,
    untrackOrder,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}
