import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { auth } from '../firebase';

// API Base URL - explicitly set to include /v1
const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api/v1';

console.log('API Base URL:', API_BASE_URL); // Debug log

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  // Removed default Content-Type header to allow FormData to set it automatically
});

// Request interceptor to add auth token and handle FormData
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      // Let browser set Content-Type for FormData (includes boundary parameter)
      // For JSON requests, explicitly set Content-Type
      if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError<any>) => {
    const errorMessage = error.response?.data?.error?.message || error.message || 'An error occurred';
    const errorCode = error.response?.data?.error?.code || 'UNKNOWN_ERROR';

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.error('Unauthorized access - redirecting to login');
      // Could trigger logout here if needed
    }

    return Promise.reject({
      message: errorMessage,
      code: errorCode,
      status: error.response?.status,
      details: error.response?.data?.error?.details,
    });
  }
);

// Generic API methods
export const api = {
  get: <T = any>(url: string, params?: any) => apiClient.get<any, T>(url, { params }),
  post: <T = any>(url: string, data?: any) => apiClient.post<any, T>(url, data),
  put: <T = any>(url: string, data?: any) => apiClient.put<any, T>(url, data),
  patch: <T = any>(url: string, data?: any) => apiClient.patch<any, T>(url, data),
  delete: <T = any>(url: string) => apiClient.delete<any, T>(url),
};

export default apiClient;
