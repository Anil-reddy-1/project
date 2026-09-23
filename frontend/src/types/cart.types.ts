/**
 * Cart Types & Interfaces
 * TypeScript definitions for shopping cart management
 */

import type { Product } from './product.types';

// Cart item with product details
export interface CartItem {
  cartItemId: string;
  quantity: number;
  addedAt: string;
  updatedAt: string;
  product: Product & {
    availableQuantity: number;
    stockStatus: 'out' | 'insufficient' | 'low' | 'healthy';
    hasStockIssue: boolean;
  };
}

// Saved item with product details
export interface SavedItem {
  savedItemId: string;
  quantity: number;
  savedAt: string;
  product: Product & {
    availableQuantity: number;
    stockStatus: 'out' | 'insufficient' | 'low' | 'healthy';
  };
}

// Get cart response
export interface GetCartResponse {
  success: boolean;
  message: string;
  data: {
    items: CartItem[];
    count: number;        // Total quantity sum
    itemCount: number;    // Number of unique items
  };
}

// Get saved items response
export interface GetSavedItemsResponse {
  success: boolean;
  message: string;
  data: {
    items: SavedItem[];
    count: number;
  };
}

// Add to cart request
export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

// Add to cart response
export interface AddToCartResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
  };
}

// Update cart item request
export interface UpdateCartItemRequest {
  quantity: number;
}

// Update cart item response
export interface UpdateCartItemResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
    updatedAt: string;
  };
}

// Remove from cart response
export interface RemoveFromCartResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
  };
}

// Clear cart response
export interface ClearCartResponse {
  success: boolean;
  message: string;
  data: {
    deletedCount: number;
  };
}

// Cart count response
export interface CartCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

// Save for later response
export interface SaveForLaterResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
    createdAt: string;
  };
}

// Move to cart response
export interface MoveToCartResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
  };
}

// Remove saved item response
export interface RemoveSavedItemResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    productId: string;
    quantity: number;
  };
}

// Move to wishlist response
export interface MoveToWishlistResponse {
  success: boolean;
  message: string;
  data: {
    success: boolean;
    message: string;
  };
}

// Stock status type
export type StockStatus = 'out' | 'insufficient' | 'low' | 'healthy';

// Cart summary for calculations
export interface CartSummary {
  subtotal: number;
  itemCount: number;
  hasStockIssues: boolean;
  hasMOQViolations: boolean;
}
