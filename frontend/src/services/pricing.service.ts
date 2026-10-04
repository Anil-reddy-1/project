import { api } from './api.service';

export interface PriceData {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  retailPrice: number;
  wholesalePrice?: number;
  costPrice?: number;
  previousRetailPrice?: number;
  margin?: number;
  lastChanged?: string;
  lastUpdated?: string;
  changedBy?: string;
  updatedBy?: string;
}

export interface PricingStats {
  totalProducts: number;
  avgRetailPrice: number;
  avgMargin: number;
  priceIncreases: number;
  priceDecreases: number;
}

export interface UpdatePricePayload {
  retailPrice: number;
  wholesalePrice?: number;
  costPrice?: number;
  reason?: string;
}

export interface BulkUpdatePayload {
  productIds: string[];
  adjustmentType: 'percentage' | 'flat';
  adjustmentValue: number;
  applyTo?: 'retail' | 'wholesale' | 'both';
  reason?: string;
}

export interface BulkUpdateResult {
  updated: number;
}

export interface PriceHistory {
  previousPrice: number;
  newPrice: number;
  previousWholesale: number;
  newWholesale: number;
  changeType: string;
  reason: string;
  changedBy: string;
  createdAt: string;
}

export const pricingService = {
  getAllPrices: async (): Promise<PriceData[]> => {
    const res = await api.get<{ success: boolean; data: { products: PriceData[] } }>('/pricing');
    return res.data.products;
  },

  getStats: async (): Promise<PricingStats> => {
    const res = await api.get<{ success: boolean; data: PricingStats }>('/pricing/stats');
    return res.data;
  },

  updatePrice: async (id: string, payload: UpdatePricePayload): Promise<PriceData> => {
    const res = await api.put<{ success: boolean; data: { priceUpdate: PriceData } }>(`/pricing/${id}`, payload);
    return res.data.priceUpdate;
  },

  bulkUpdate: async (payload: BulkUpdatePayload): Promise<BulkUpdateResult> => {
    const res = await api.put<{ success: boolean; data: BulkUpdateResult }>('/pricing/bulk', payload);
    return res.data;
  },

  getPriceHistory: async (id: string): Promise<PriceHistory[]> => {
    const res = await api.get<{ success: boolean; data: { history: PriceHistory[] } }>(`/pricing/${id}/history`);
    return res.data.history;
  },
  
  exportPricing: async (): Promise<Blob> => {
    // Note: Use axios directly or a different config if we need a blob, 
    // assuming our api client handles it or we'll fetch manually.
    // Given api.service.ts intercepts and parses JSON by default, we might need a raw fetch.
    // const token = localStorage.getItem('token') || ''; // Adjust depending on auth system, here api client uses firebase auth internally.
    
    // Instead of raw fetch, let's just use window.open if it requires auth we might need to append token.
    // For now, let's just make it return the api endpoint for the component to handle or fetch it using api.get with responseType: 'blob'
    // since api.get doesn't support custom config easily, we might need to handle it via a direct fetch.
    return new Blob(); // Placeholder, will implement download in component if possible.
  }
};
