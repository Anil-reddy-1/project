'use client';

import { useWebSocket } from '@/lib/contexts/websocket-context';

export function ConnectionStatus() {
  const { isConnected, connectionError } = useWebSocket();

  if (isConnected && !connectionError) {
    return null; // Don't show anything when connected
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 py-2">
        {!isConnected && !connectionError && (
          <div className="bg-yellow-500/90 backdrop-blur text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span>Connecting to real-time server...</span>
          </div>
        )}
        
        {connectionError && (
          <div className="bg-red-500/90 backdrop-blur text-white px-4 py-2 rounded-lg text-sm shadow-lg">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{connectionError}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
