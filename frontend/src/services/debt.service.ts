import { api } from './api.service';

export interface Debt {
  id: string;
  description: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'cleared';
  dueDate: string;
  createdAt: string;
}

export interface DebtSummary {
  totalPending: number;
  totalCleared: number;
  overdueCount: number;
}

export interface DebtsResponse {
  success: boolean;
  data: {
    debts: Debt[];
    summary: DebtSummary;
  };
}

export interface CreateDebtPayload {
  description: string;
  amount: number;
  dueDate: string;
  notes?: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  amount: number;
  previousBalance: number;
  newBalance: number;
  paymentDate: string;
  recordedBy: string;
}

export interface RecordPaymentPayload {
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}

export const debtService = {
  getDebts: (params?: {
    status?: string;
    overdue?: boolean;
  }) => api.get<DebtsResponse>('/debts', params),

  createDebt: (payload: CreateDebtPayload) =>
    api.post<{ success: boolean; data: { debt: Debt } }>('/debts', payload),

  recordPayment: (id: string, payload: RecordPaymentPayload) =>
    api.post<{ success: boolean; data: { payment: DebtPayment } }>(
      `/debts/${id}/payment`,
      payload
    ),
};
