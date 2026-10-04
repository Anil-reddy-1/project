import { api } from './api.service';

export type ReportType = 
  | 'daily_operations' 
  | 'sales' 
  | 'stock' 
  | 'delivery' 
  | 'staff_performance' 
  | 'debt' 
  | 'financial_summary';

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerateReportPayload {
  type: ReportType;
  startDate: string;
  endDate: string;
  filters?: Record<string, any>;
}

export interface QuickAnalyticsPayload {
  type: ReportType;
  startDate: string;
  endDate: string;
  filters?: Record<string, any>;
}

export interface Report {
  id: string;
  title: string;
  type: ReportType;
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: Record<string, any>;
  status: ReportStatus;
  metadata?: any;
  generatedBy?: string;
  scheduledReportId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ReportFilters {
  type?: ReportType;
  status?: ReportStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalReports: number;
  reportsPerPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface GenerateReportResponse {
  success: boolean;
  message: string;
  data: {
    report: Report;
  };
}

export interface GetAllReportsResponse {
  success: boolean;
  message: string;
  data: {
    reports: Report[];
    pagination: PaginationInfo;
  };
}

export interface GetReportResponse {
  success: boolean;
  message: string;
  data: {
    report: Report;
  };
}

export interface QuickAnalyticsResponse {
  success: boolean;
  message: string;
  data: {
    type: ReportType;
    dateRangeStart: string;
    dateRangeEnd: string;
    analytics: any;
  };
}

export interface DeleteReportResponse {
  success: boolean;
  message: string;
  data: {
    reportId: string;
  };
}

// Scheduled Reports
export interface ScheduledReport {
  id: string;
  title: string;
  reportType: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly';
  filters?: Record<string, any>;
  lastRun?: string;
  nextRun: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateScheduledReportPayload {
  title: string;
  reportType: ReportType;
  frequency: 'daily' | 'weekly' | 'monthly';
  filters?: Record<string, any>;
}

export interface UpdateScheduledReportPayload {
  title?: string;
  frequency?: 'daily' | 'weekly' | 'monthly';
  filters?: Record<string, any>;
  isActive?: boolean;
}

export interface ScheduledReportResponse {
  success: boolean;
  message: string;
  data: {
    scheduledReport: ScheduledReport;
    generatedReports?: Array<{
      id: string;
      title: string;
      type: ReportType;
      dateRangeStart: string;
      dateRangeEnd: string;
      status: ReportStatus;
      createdAt: string;
    }>;
  };
}

export interface GetAllScheduledReportsResponse {
  success: boolean;
  message: string;
  data: {
    scheduledReports: ScheduledReport[];
    total: number;
  };
}

export const reportService = {
  /**
   * Generate and save a new report
   */
  generateReport: (payload: GenerateReportPayload) =>
    api.post<GenerateReportResponse>('/reports', payload).then(res => res.data),

  /**
   * Get all reports with optional filtering and pagination
   */
  getAllReports: (filters?: ReportFilters) => {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

    const queryString = params.toString();
    const url = queryString ? `/reports?${queryString}` : '/reports';
    
    return api.get<GetAllReportsResponse>(url).then(res => res.data);
  },

  /**
   * Get a specific report by ID
   */
  getReportById: (reportId: string) =>
    api.get<GetReportResponse>(`/reports/${reportId}`).then(res => res.data),

  /**
   * Delete a report
   */
  deleteReport: (reportId: string) =>
    api.delete<DeleteReportResponse>(`/reports/${reportId}`).then(res => res.data),

  /**
   * Download a report
   */
  downloadReport: (reportId: string, format: 'json' | 'csv' | 'pdf' = 'json') => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4001';
    const url = `${baseUrl}/api/reports/${reportId}/download?format=${format}`;
    window.open(url, '_blank');
    return Promise.resolve();
  },

  /**
   * Get quick analytics without saving as a report
   */
  getQuickAnalytics: (payload: QuickAnalyticsPayload) =>
    api.post<QuickAnalyticsResponse>('/reports/analytics', payload).then(res => res.data),
};

export const scheduledReportService = {
  /**
   * Create a new scheduled report
   */
  createScheduledReport: (payload: CreateScheduledReportPayload) =>
    api.post<ScheduledReportResponse>('/scheduled-reports', payload).then(res => res.data),

  /**
   * Get all scheduled reports
   */
  getAllScheduledReports: (filters?: { reportType?: ReportType; isActive?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.reportType) params.append('reportType', filters.reportType);
    if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());

    const queryString = params.toString();
    const url = queryString ? `/scheduled-reports?${queryString}` : '/scheduled-reports';
    
    return api.get<GetAllScheduledReportsResponse>(url).then(res => res.data);
  },

  /**
   * Get a specific scheduled report by ID
   */
  getScheduledReportById: (id: string) =>
    api.get<ScheduledReportResponse>(`/scheduled-reports/${id}`).then(res => res.data),

  /**
   * Update a scheduled report
   */
  updateScheduledReport: (id: string, payload: UpdateScheduledReportPayload) =>
    api.patch<ScheduledReportResponse>(`/scheduled-reports/${id}`, payload).then(res => res.data),

  /**
   * Delete a scheduled report
   */
  deleteScheduledReport: (id: string) =>
    api.delete<{ success: boolean; message: string; data: { scheduledReportId: string } }>(`/scheduled-reports/${id}`).then(res => res.data),

  /**
   * Toggle scheduled report active status
   */
  toggleScheduledReport: (id: string) =>
    api.post<ScheduledReportResponse>(`/scheduled-reports/${id}/toggle`, {}).then(res => res.data),

  /**
   * Manually trigger a scheduled report to run now
   */
  runScheduledReport: (id: string) =>
    api.post<{ success: boolean; message: string; data: { message: string; scheduledReportId: string } }>(`/scheduled-reports/${id}/run`, {}).then(res => res.data),
};
