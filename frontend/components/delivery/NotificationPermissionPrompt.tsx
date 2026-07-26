'use client';

import { useState } from 'react';
import { useFCM } from '@/lib/hooks/useFCM';

export function NotificationPermissionPrompt() {
  const { isSupported, permission, requestPermission, isLoading } = useFCM();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if already granted or not supported
  if (!isSupported || permission === 'granted' || permission === 'denied' || isDismissed) {
    return null;
  }

  const handleEnable = async () => {
    const result = await requestPermission();
    if (result === 'granted') {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg p-4 mb-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔔</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg mb-1">
            Enable Notifications
          </h3>
          <p className="text-sm text-blue-50 mb-3">
            Get instant alerts for new delivery assignments, order updates, and surge pricing opportunities.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleEnable}
              disabled={isLoading}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg font-semibold text-sm hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Enabling...' : 'Enable Notifications'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 bg-white/10 text-white rounded-lg font-semibold text-sm hover:bg-white/20 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 text-xs text-blue-100">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>You can change this anytime in your browser settings.</span>
      </div>
    </div>
  );
}
