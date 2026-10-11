import { api } from './api.service';

/**
 * Pricing Service
 * Admin-only API calls for the 4-field pricing model:
 *   costPrice     → private acquisition cost (never exposed to buyers)
 *   displayPrice  → MRP / reference price (strikethrough in buyer UI)
 *   sellingPrice  → actual buyer-facing price
 *   minimumMarginPercent → floor threshold for margin alerts
 */

export interface PriceData {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  status?: string;
  quantity?: number;
  // 4-field pricing model
  costPrice?: number | null;
  displayPrice?: number | null;
  sellingPrice?: number | null;
  minimumMarginPercent?: number | null;
  // Computed metrics (read-only)
  discountAmount?: number | null;
  discountPercent?: number | null;
  grossProfit?: number | null;
  grossMarginPercent?: number | null;
  markupPercent?: number | null;
  isBelowMinMargin?: boolean;
  // Audit
  lastChanged?: string;
  lastUpdated?: string;
  changedBy?: string;
  changedByName?: string | null;
}

export interface PricingStats {
  totalProducts: number;
  avgSellingPrice: number;
  avgMargin: number;
  productsOnOffer: number;
  lowMarginProducts: number;
}

export interface UpdatePricePayload {
  costPrice?: number;
  displayPrice?: number;
  sellingPrice?: number;
  minimumMarginPercent?: number;
  reason?: string;
}

export interface BulkUpdatePayload {
  productIds: string[];
  adjustmentType: 'percentage' | 'flat';
  adjustmentValue: number;
  applyTo?: 'selling' | 'display' | 'both';
  reason?: string;
}

export interface BulkUpdateResult {
  updated: number;
}

export interface PriceHistory {
  previousCost?: number | null;
  newCost?: number | null;
  previousDisplayPrice?: number | null;
  newDisplayPrice?: number | null;
  previousSellingPrice?: number | null;
  newSellingPrice?: number | null;
  changeType: string;
  reason: string;
  changedByName?: string | null;
  createdAt: string;
}

export interface SuggestPriceResult {
  costPrice: number;
  targetMarginPercent: number;
  suggestedSellingPrice: number;
}

export const pricingService = {
  getAllPrices: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    minMargin?: number;
    maxMargin?: number;
    hasDiscount?: boolean;
  }): Promise<PriceData[]> => {
    const res = await api.get<{ success: boolean; data: { products: PriceData[] } }>('/pricing', params);
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

  suggestSellingPrice: async (costPrice: number, targetMarginPercent: number): Promise<SuggestPriceResult> => {
    const res = await api.post<{ success: boolean; data: SuggestPriceResult }>('/pricing/suggest', {
      costPrice,
      targetMarginPercent,
    });
    return res.data;
  },

  exportPricing: (): void => {
    // Direct browser download — requires the user to be authenticated via token in Authorization header.
    // The component handles this with a raw fetch + blob download.
    window.open('/api/v1/pricing/export', '_blank');
  },
};
