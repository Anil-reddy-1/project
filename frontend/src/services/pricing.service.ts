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

export interface ProductPricing {
  id: string;
  sku: string;
  name: string;
  currentPrice: number;
  previousPrice: number;
  lastChanged: string;
  changedBy: string;
}

export interface PricingResponse {
  success: boolean;
  data: {
    products: ProductPricing[];
  };
}

export interface UpdatePricePayload {
  newPrice?: number;
  retailPrice?: number;
  wholesalePrice?: number;
  costPrice?: number;
  reason?: string;
  effectiveDate?: string;
}

export interface PriceUpdate {
  productId: string;
  previousPrice: number;
  newPrice: number;
  change: number;
  changePercentage: number;
  updatedBy: string;
  timestamp: string;
}

export interface PriceHistory {
  price: number;
  effectiveDate: string;
  changedBy: string;
}

export interface PriceHistoryResponse {
  success: boolean;
  data: {
    history: PriceHistory[];
  };
}

export const pricingService = {
  getPricing: () => api.get<PricingResponse>('/pricing'),

  getAllPrices: async (): Promise<PriceData[]> => {
    const res = await api.get<PricingResponse>('/pricing');
    // Map ProductPricing to PriceData shape
    return (res.data.products as any[]).map((p: any) => ({
      id: p.id,
      productId: p.id,
      productName: p.name || p.productName,
      sku: p.sku,
      category: p.category,
      retailPrice: p.currentPrice ?? p.retailPrice,
      wholesalePrice: p.wholesalePrice,
      costPrice: p.costPrice,
      previousRetailPrice: p.previousPrice ?? p.previousRetailPrice,
      lastChanged: p.lastChanged,
      changedBy: p.changedBy,
    }));
  },

  updatePrice: async (id: string, payload: UpdatePricePayload): Promise<PriceData> => {
    const res = await api.put<{ success: boolean; data: { priceUpdate: any } }>(`/pricing/${id}`, payload);
    return res.data.priceUpdate as PriceData;
  },

  getPriceHistory: (id: string) =>
    api.get<PriceHistoryResponse>(`/pricing/${id}/history`),
};
