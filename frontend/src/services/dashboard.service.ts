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

export const dashboardService = {
  getStats: () => api.get<{ success: boolean; data: DashboardStats }>('/dashboard/stats'),
};
