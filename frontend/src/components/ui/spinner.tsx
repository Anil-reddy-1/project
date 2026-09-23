import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

/**
 * Animated Spinner Component
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear',
      }}
      className={className}
    >
      <Loader2 className={`${sizeClasses[size]} text-current`} />
    </motion.div>
  );
};

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
}

/**
 * Loading Overlay Component
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`
        ${fullScreen ? 'fixed inset-0' : 'absolute inset-0'}
        flex items-center justify-center bg-white/80 backdrop-blur-sm z-50
      `}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-blue-600" />
        {message && (
          <p className="text-sm text-slate-600 font-medium">{message}</p>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Inline Spinner for buttons
 */
export const ButtonSpinner: React.FC = () => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        ease: 'linear',
      }}
    >
      <Loader2 className="w-4 h-4" />
    </motion.div>
  );
};
