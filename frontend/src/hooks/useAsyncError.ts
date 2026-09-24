import { useState, useCallback } from 'react';
import { handleError } from '../utils/errorHandler';
import type { AppError } from '../utils/errorHandler';

interface UseAsyncErrorOptions {
  operation: string;
  showToast?: boolean;
  onError?: (error: AppError) => void;
}

interface UseAsyncErrorReturn<T extends (...args: any[]) => Promise<any>> {
  execute: T;
  loading: boolean;
  error: AppError | null;
  reset: () => void;
}

/**
 * Custom hook for handling async operations with error handling
 * Provides loading state, error state, and automatic error handling
 */
export function useAsyncError<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  options: UseAsyncErrorOptions
): UseAsyncErrorReturn<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | undefined> => {
      try {
        setLoading(true);
        setError(null);
        const result = await asyncFunction(...args);
        return result;
      } catch (err) {
        const appError = handleError(err, options.operation, undefined, {
          showToast: options.showToast !== false,
          logToConsole: true,
          throwError: false,
        });
        
        setError(appError);
        
        if (options.onError) {
          options.onError(appError);
        }
        
        return undefined;
      } finally {
        setLoading(false);
      }
    },
    [asyncFunction, options]
  ) as T;

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return {
    execute,
    loading,
    error,
    reset,
  };
}
