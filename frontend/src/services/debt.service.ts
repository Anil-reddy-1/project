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
  type: 'payable' | 'receivable';
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
  data: Debt[];
}

export interface CreateDebtPayload {
  description?: string;
  creditorName: string;
  invoiceNumber?: string;
  referenceNumber?: string;
  priority?: 'high' | 'medium' | 'low';
  type?: 'payable' | 'receivable';
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
  getAllDebts: async (type?: 'payable' | 'receivable'): Promise<Debt[]> => {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    // Axios interceptor already returns response.data (the body)
    // Body shape: { success, message, data: [...], meta: {...} }
    const res: any = await api.get('/debts', params);
    return res.data || [];
  },

  createDebt: async (payload: CreateDebtPayload): Promise<Debt> => {
    const res: any = await api.post('/debts', payload);
    return res.data;
  },

  recordPayment: async (payload: RecordPaymentPayload): Promise<DebtPayment> => {
    const id = payload.debtId || '';
    const res: any = await api.post(
      `/debts/${id}/payment`,
      payload
    );
    return res.data?.payment || res.data;
  },
};
