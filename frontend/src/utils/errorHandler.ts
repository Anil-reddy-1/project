/**
 * Error Handler Utility
 * Parse and format API errors for user-friendly display
 */

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode?: number;
}

/**
 * Extract error message from various error formats
 */
export function getErrorMessage(error: any): string {
  // Handle Axios error responses
  if (error.response) {
    const { data, status } = error.response;
    
    // Custom API error format
    if (data?.message) {
      return data.message;
    }
    
    // Validation errors
    if (data?.errors && Array.isArray(data.errors)) {
      return data.errors.map((e: any) => e.message || e).join(', ');
    }
    
    // HTTP status-based messages
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You are not authenticated. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'Validation failed. Please check your input.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return `Request failed with status ${status}`;
    }
  }
  
  // Handle network errors
  if (error.request) {
    return 'Network error. Please check your connection.';
  }
  
  // Handle JavaScript errors
  if (error instanceof Error) {
    return error.message;
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }
  
  // Fallback
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Parse API error into structured format
 */
export function parseApiError(error: any): ApiError {
  const message = getErrorMessage(error);
  const statusCode = error.response?.status;
  const code = error.response?.data?.code;
  const field = error.response?.data?.field;
  
  return {
    message,
    code,
    field,
    statusCode
  };
}

/**
 * Check if error is a specific type
 */
export function isAuthError(error: any): boolean {
  const statusCode = error.response?.status;
  return statusCode === 401 || statusCode === 403;
}

export function isValidationError(error: any): boolean {
  const statusCode = error.response?.status;
  return statusCode === 400 || statusCode === 422;
}

export function isNetworkError(error: any): boolean {
  return !!error.request && !error.response;
}

export function isServerError(error: any): boolean {
  const statusCode = error.response?.status;
  return statusCode && statusCode >= 500;
}

/**
 * Handle errors with automatic retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry client errors (4xx)
      if (error.response?.status && error.response.status < 500) {
        throw error;
      }
      
      // Wait before retrying
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
      }
    }
  }
  
  throw lastError;
}

/**
 * Format validation errors for forms
 */
export function formatValidationErrors(error: any): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
    error.response.data.errors.forEach((err: any) => {
      if (err.field && err.message) {
        errors[err.field] = err.message;
      }
    });
  }
  
  return errors;
}
