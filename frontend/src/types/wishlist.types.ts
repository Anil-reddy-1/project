/**
 * Wishlist Types & Interfaces
 * TypeScript definitions for wishlist management
 */

import type { Product } from './product.types';

// Wishlist item
export interface WishlistItem {
  wishlistId: string;
  addedAt: string;
  product: Product;
}

// Wishlist response
export interface WishlistResponse {
  success: boolean;
  message: string;
  data: WishlistItem[];
  count: number;
}

// Add to wishlist request
export interface AddToWishlistRequest {
  productId: string;
}

// Add to wishlist response
export interface AddToWishlistResponse {
  success: boolean;
  message: string;
  data: {
    id?: string;
    userId?: string;
    productId?: string;
    createdAt?: string;
    alreadyExists?: boolean;
  };
}

// Remove from wishlist response
export interface RemoveFromWishlistResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    userId: string;
    productId: string;
  };
}

// Check wishlist response
export interface CheckWishlistResponse {
  success: boolean;
  data: {
    isInWishlist: boolean;
  };
}

// Wishlist count response
export interface WishlistCountResponse {
  success: boolean;
  data: {
    count: number;
  };
}

// Clear wishlist response
export interface ClearWishlistResponse {
  success: boolean;
  message: string;
  data: {
    deletedCount: number;
  };
}
