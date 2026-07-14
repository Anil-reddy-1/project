/**
 * Error Display Components
 * Task #19: Error state components
 * 
 * Display error messages and states
 */

'use client';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  showIcon?: boolean;
}

export function ErrorDisplay({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  showIcon = true,
}: ErrorDisplayProps) {
  return (
    <div className="text-center py-12 px-4">
      {showIcon && (
        <div className="mb-4 flex justify-center">
          <svg
            className="w-16 h-16 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">{message}</p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
      <svg
        className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm text-red-600 flex-1">{message}</p>
    </div>
  );
}

export function InlineWarning({ message }: { message: string }) {
  return (
    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
      <svg
        className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <p className="text-sm text-yellow-700 flex-1">{message}</p>
    </div>
  );
}

export function InlineSuccess({ message }: { message: string }) {
  return (
    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
      <svg
        className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm text-green-700 flex-1">{message}</p>
    </div>
  );
}

export function InlineInfo({ message }: { message: string }) {
  return (
    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
      <svg
        className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-sm text-blue-700 flex-1">{message}</p>
    </div>
  );
}

export function ErrorBoundaryFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          
          <p className="text-sm text-gray-600 mb-6">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>

          <div className="flex gap-4 justify-center">
            <button
              onClick={resetError}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/retailer'}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NetworkError({ onRetry }: { onRetry?: () => void }) {
  return (
    <ErrorDisplay
      title="Connection Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      retryLabel="Retry Connection"
    />
  );
}

export function NotFoundError({ resourceName = 'Page' }: { resourceName?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="mb-4 flex justify-center">
        <svg
          className="w-16 h-16 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {resourceName} Not Found
      </h3>
      <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
        The {resourceName.toLowerCase()} you're looking for doesn't exist or has been removed.
      </p>

      <button
        onClick={() => window.history.back()}
        className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
      >
        Go Back
      </button>
    </div>
  );
}

export function UnauthorizedError() {
  return (
    <ErrorDisplay
      title="Access Denied"
      message="You don't have permission to view this page. Please log in or contact support if you believe this is an error."
      onRetry={() => window.location.href = '/'}
      retryLabel="Go to Home"
    />
  );
}
