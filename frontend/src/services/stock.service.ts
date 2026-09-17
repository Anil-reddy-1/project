import { api } from './api.service';

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  price: number;
  lastUpdated: string;
  status: 'active' | 'low-stock' | 'out-of-stock';
}

export interface StockResponse {
  success: boolean;
  data: {
    items: StockItem[];
  };
}

export interface StockAdjustment {
  id: string;
  productId: string;
  type: 'add' | 'remove';
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  performedBy: string;
  timestamp: string;
}

export interface StockAdjustPayload {
  productId: string;
  type: 'add' | 'remove';
  quantity: number;
  reason: string;
  notes?: string;
}

export interface StockHistoryResponse {
  success: boolean;
  data: {
    history: StockAdjustment[];
  };
}

export const stockService = {
  getStock: (params?: {
    search?: string;
    status?: string;
    category?: string;
  }) => api.get<StockResponse>('/stock', params),

  adjustStock: (payload: StockAdjustPayload) =>
    api.post<{ success: boolean; data: { adjustment: StockAdjustment } }>(
      '/stock/adjust',
      payload
    ),

  getStockHistory: (id: string) =>
    api.get<StockHistoryResponse>(`/stock/${id}/history`),
};
