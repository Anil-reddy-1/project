import { api } from './api.service';

export interface GenerateReportPayload {
  type: string;
  startDate: string;
  endDate: string;
  format: string;
}

export interface Report {
  id: string;
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  generatedAt: string;
  fileSize?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
}

export interface GenerateReportResponse {
  success: boolean;
  data: Report;
}

export interface GetAllReportsResponse {
  success: boolean;
  data: Report[];
}

export const reportService = {
  // Mock getAllReports since backend doesn't have this endpoint yet
  getAllReports: () => {
    // Return empty array for now - backend doesn't have list endpoint
    return Promise.resolve([]);
  },

  generateReport: (payload: GenerateReportPayload) =>
    api.post<GenerateReportResponse>('/reports/generate', payload).then(res => res.data),

  downloadReport: (reportId: string) => {
    const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api/v1';
    window.open(`${baseUrl}/reports/${reportId}/download`, '_blank');
    return Promise.resolve();
  },
};
