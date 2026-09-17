import { api } from './api.service';

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
  newPrice: number;
  reason: string;
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

  updatePrice: (id: string, payload: UpdatePricePayload) =>
    api.put<{ success: boolean; data: { priceUpdate: PriceUpdate } }>(
      `/pricing/${id}`,
      payload
    ),

  getPriceHistory: (id: string) =>
    api.get<PriceHistoryResponse>(`/pricing/${id}/history`),
};
