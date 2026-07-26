'use client';

import { useEffect, useState } from 'react';
import { useFCM } from '@/lib/hooks/useFCM';
import { useRouter } from 'next/navigation';

export function NotificationBanner() {
  const { lastNotification, clearNotification } = useFCM();
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (lastNotification) {
      setIsVisible(true);

      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(clearNotification, 300); // Clear after fade out
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [lastNotification, clearNotification]);

  if (!lastNotification || !isVisible) {
    return null;
  }

  const handleClick = () => {
    // Navigate to relevant page based on notification type
    const clickAction = lastNotification.data?.clickAction;
    if (clickAction) {
      router.push(clickAction);
    }
    setIsVisible(false);
    setTimeout(clearNotification, 300);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(clearNotification, 300);
  };

  return (
    <div className="fixed top-20 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="max-w-md mx-auto pointer-events-auto">
        <div
          className={`
            bg-slate-800 text-white rounded-lg shadow-2xl p-4 
            cursor-pointer hover:bg-slate-700 transition-all
            ${isVisible ? 'animate-slide-down opacity-100' : 'opacity-0'}
          `}
          onClick={handleClick}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-xl">🔔</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                {lastNotification.title}
              </h3>
              <p className="text-sm text-slate-300">
                {lastNotification.body}
              </p>
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {lastNotification.data?.type && (
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300">
                {lastNotification.data.type.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-slate-400">
                Tap to view
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
