import { api } from './api.service';
import type { ReportType } from './report.service';

export interface AnalyticsPayload {
  type: ReportType;
  startDate: string;
  endDate: string;
  filters?: Record<string, any>;
}

export interface SalesAnalytics {
  summary: {
    total_orders: number;
    total_revenue: number;
    average_order_value: number;
    unique_customers: number;
  };
  ordersByStatus: Array<{
    status: string;
    count: number;
    revenue: number;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sku: string;
    units_sold: number;
    revenue: number;
  }>;
  dailyTrend: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  paymentMethods: Array<{
    payment_method: string;
    count: number;
    revenue: number;
  }>;
  topCategories: Array<{
    category: string;
    orders: number;
    units_sold: number;
    revenue: number;
  }>;
}

export interface StockAnalytics {
  summary: {
    total_products: number;
    total_units: number;
    inventory_value: number;
    active_products: number;
    out_of_stock_count: number;
    low_stock_count: number;
  };
  lowStockItems: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    min_stock: number;
    unit: string;
    price: number;
  }>;
  outOfStockItems: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    min_stock: number;
    unit: string;
    price: number;
    last_updated: string;
  }>;
  categoryDistribution: Array<{
    category: string;
    product_count: number;
    total_units: number;
    category_value: number;
  }>;
  stockMovements: Array<{
    date: string;
    type: string;
    transaction_count: number;
    total_quantity: number;
  }>;
  topValueProducts: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    unit_value: number;
    total_value: number;
  }>;
  stockTurnover: Array<{
    id: string;
    sku: string;
    name: string;
    current_stock: number;
    units_sold: number;
    turnover_ratio: number;
  }>;
}

export interface DeliveryAnalytics {
  summary: {
    total_deliveries: number;
    delivered_count: number;
    failed_count: number;
    cancelled_count: number;
    in_progress_count: number;
    avg_delivery_hours: number;
  };
  statusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  partnerPerformance: Array<{
    partner_name: string;
    partner_id: string;
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    success_rate: number;
    avg_delivery_hours: number;
  }>;
  dailyTrend: Array<{
    date: string;
    total: number;
    delivered: number;
    failed: number;
  }>;
  deliveryTimeDistribution: Array<{
    time_bucket: string;
    count: number;
  }>;
}

export interface StaffAnalytics {
  summary: {
    total_staff: number;
    active_staff: number;
    available_staff: number;
    busy_staff: number;
    delivery_partners: number;
  };
  staffByRole: Array<{
    role: string;
    count: number;
    active_count: number;
  }>;
  availabilityDistribution: Array<{
    availability: string;
    count: number;
    percentage: number;
  }>;
  deliveryPartnerWorkload: Array<{
    id: string;
    name: string;
    email: string;
    availability: string;
    current_active: number;
    period_deliveries: number;
    successful_deliveries: number;
    success_rate: number;
  }>;
  staffPerformance: Array<{
    id: string;
    name: string;
    role: string;
    total_tasks: number;
    completed_tasks: number;
    avg_completion_hours: number;
  }>;
}

export interface DebtAnalytics {
  summary: {
    total_debts: number;
    total_original: number;
    total_paid: number;
    total_outstanding: number;
    pending_count: number;
    partial_count: number;
    cleared_count: number;
    overdue_count: number;
    overdue_amount: number;
  };
  debtsByStatus: Array<{
    status: string;
    count: number;
    outstanding_amount: number;
    percentage: number;
  }>;
  debtsByType: Array<{
    type: string;
    count: number;
    original_amount: number;
    outstanding_amount: number;
  }>;
  debtsByPriority: Array<{
    priority: string;
    count: number;
    outstanding_amount: number;
  }>;
  agingAnalysis: Array<{
    aging_bucket: string;
    count: number;
    outstanding_amount: number;
  }>;
  topCreditors: Array<{
    creditor_name: string;
    debt_count: number;
    total_borrowed: number;
    total_paid: number;
    outstanding_amount: number;
  }>;
  paymentHistory: Array<{
    date: string;
    payment_count: number;
    total_paid: number;
  }>;
  upcomingDueDates: Array<{
    id: string;
    creditor_name: string;
    description: string;
    remaining_amount: number;
    due_date: string;
    priority: string;
    status: string;
  }>;
}

export interface DailyOperationsAnalytics {
  dailySummary: Array<{
    date: string;
    orders: number;
    revenue: number;
    deliveries: number;
    completed_deliveries: number;
  }>;
  periodTotals: {
    total_orders: number;
    total_revenue: number;
    total_deliveries: number;
    completed_deliveries: number;
    stock_adjustments: number;
    unique_customers: number;
  };
  hourlyPattern: Array<{
    hour: number;
    order_count: number;
  }>;
  stockMovementsSummary: Array<{
    type: string;
    count: number;
    total_quantity: number;
  }>;
  stockAlerts: Array<{
    id: string;
    sku: string;
    name: string;
    quantity: number;
    min_stock: number;
    status: string;
  }>;
}

export interface FinancialSummaryAnalytics {
  revenue: {
    total_revenue: number;
    average_order_value: number;
    total_transactions: number;
    unique_customers: number;
  };
  costAnalysis: {
    total_cogs: number;
    total_sales: number;
    gross_profit: number;
    gross_profit_margin: string;
  };
  debts: {
    payables: number;
    receivables: number;
    pending_payables: number;
    pending_receivables: number;
  };
  inventory: {
    inventory_value: number;
    product_count: number;
  };
  previousPeriod: {
    previous_revenue: number;
    previous_orders: number;
    previous_avg_order_value: number;
  };
  growth: {
    revenue_growth: string;
    orders_growth: string;
  };
  paymentMethods: Array<{
    payment_method: string;
    transaction_count: number;
    revenue: number;
  }>;
  revenueTrend: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  ratios: {
    current_assets: number;
    current_liabilities: number;
    working_capital: number;
    inventory_turnover: string;
  };
}

export type AnalyticsData = 
  | SalesAnalytics 
  | StockAnalytics 
  | DeliveryAnalytics 
  | StaffAnalytics 
  | DebtAnalytics 
  | DailyOperationsAnalytics 
  | FinancialSummaryAnalytics;

export interface AnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    type: ReportType;
    dateRangeStart: string;
    dateRangeEnd: string;
    analytics: AnalyticsData;
  };
}

export const analyticsService = {
  /**
   * Get analytics data without saving as a report
   */
  getAnalytics: (payload: AnalyticsPayload) =>
    api.post<AnalyticsResponse>('/reports/analytics', payload).then(res => res.data),

  /**
   * Get sales analytics
   */
  getSalesAnalytics: (startDate: string, endDate: string, filters?: Record<string, any>) =>
    api.post<AnalyticsResponse>('/reports/analytics', {
      type: 'sales',
      startDate,
      endDate,
      filters,
    }).then(res => res.data.analytics as SalesAnalytics),

  /**
   * Get stock analytics
   */
  getStockAnalytics: (startDate: string, endDate: string, filters?: Record<string, any>) =>
    api.post<AnalyticsResponse>('/reports/analytics', {
      type: 'stock',
      startDate,
      endDate,
      filters,
    }).then(res => res.data.analytics as StockAnalytics),

  /**
   * Get delivery analytics
   */
  getDeliveryAnalytics: (startDate: string, endDate: string, filters?: Record<string, any>) =>
    api.post<AnalyticsResponse>('/reports/analytics', {
      type: 'delivery',
      startDate,
      endDate,
      filters,
    }).then(res => res.data.analytics as DeliveryAnalytics),

  /**
   * Get staff performance analytics
   */
  getStaffAnalytics: (startDate: string, endDate: string, filters?: Record<string, any>) =>
    api.post<AnalyticsResponse>('/reports/analytics', {
      type: 'staff_performance',
      startDate,
      endDate,
      filters,
    }).then(res => res.data.analytics as StaffAnalytics),

  /**
   * Get debt analytics
   */
  getDebtAnalytics: (startDate: string, endDate: string, filters?: Record<string, any>) =>
    api.post<AnalyticsResponse>('/reports/analytics', {
      type: 'debt',
      startDate,
      endDate,
      filters,
    }).then(res => res.data.analytics as DebtAnalytics),

  /**
   * Get daily operations analytics
   */
  getDailyOperationsAnalytics: (startDate: string, endDate: string, filters?: Record<string, any>) =>
    api.post<AnalyticsResponse>('/reports/analytics', {
      type: 'daily_operations',
      startDate,
      endDate,
      filters,
    }).then(res => res.data.analytics as DailyOperationsAnalytics),

  /**
   * Get financial summary analytics
   */
  getFinancialSummaryAnalytics: (startDate: string, endDate: string, filters?: Record<string, any>) =>
    api.post<AnalyticsResponse>('/reports/analytics', {
      type: 'financial_summary',
      startDate,
      endDate,
      filters,
    }).then(res => res.data.analytics as FinancialSummaryAnalytics),
};
