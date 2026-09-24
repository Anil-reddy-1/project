import { api } from './api.service';

export interface Debt {
  id: string;
  description?: string;
  creditorName: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'pending' | 'partial' | 'cleared' | 'overdue';
  priority?: 'high' | 'medium' | 'low';
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
  debtId?: string;
  amount: number;
  paymentDate?: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
}

export const debtService = {
  getAllDebts: async (): Promise<Debt[]> => {
    const res = await api.get<DebtsResponse>('/debts');
    return res.data.debts;
  },

  createDebt: (payload: CreateDebtPayload) =>
    api.post<{ success: boolean; data: { debt: Debt } }>('/debts', payload),

  recordPayment: async (payload: RecordPaymentPayload): Promise<Debt> => {
    const id = payload.debtId || '';
    const res = await api.post<{ success: boolean; data: { debt: Debt } }>(
      `/debts/${id}/payment`,
      payload
    );
    return res.data.debt;
  },
};
