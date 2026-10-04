import { api } from './api.service';

export interface DashboardStats {
  revenue: {
    total: number;
    change: number;
    period: string;
  };
  orders: {
    total: number;
    change: number;
    pending: number;
  };
  lowStockItems: number;
  activeDeliveries: number;
  pendingDebts: number;
}

export interface DashboardStatsResponse {
  success: boolean;
  message: string;
  data: DashboardStats;
}

export const dashboardService = {
  /**
   * Get dashboard statistics
   */
  getStats: () => api.get<DashboardStatsResponse>('/dashboard/stats').then(res => res.data),
};
