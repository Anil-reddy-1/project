/**
 * Socket.IO React Context
 * Provides real-time connection state and event subscriptions across the app
 */

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '../services/socket.service';
import { useAuth } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  connected: false,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const connectingRef = useRef(false);

  const connect = useCallback(async () => {
    if (connectingRef.current) return;
    connectingRef.current = true;

    try {
      const s = await connectSocket();
      if (s) {
        setSocket(s);
        setConnected(s.connected);

        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));
      }
    } finally {
      connectingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    }

    return () => {
      disconnectSocket();
      setSocket(null);
      setConnected(false);
    };
  }, [user, connect]);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

/**
 * Hook to access the socket instance and connection status
 */
export function useSocket() {
  return useContext(SocketContext);
}

/**
 * Hook to subscribe to a specific socket event
 * Automatically cleans up on unmount
 */
export function useSocketEvent<T = any>(event: string, handler: (data: T) => void) {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [socket, event, handler]);
}
