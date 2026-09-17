/**
 * Wishlist Service
 * API calls for wishlist management
 */

import { api } from './api.service';
import type {
  WishlistResponse,
  AddToWishlistRequest,
  AddToWishlistResponse,
  RemoveFromWishlistResponse,
  CheckWishlistResponse,
  WishlistCountResponse,
  ClearWishlistResponse
} from '../types/wishlist.types';

class WishlistService {
  private readonly baseUrl = '/wishlist';

  /**
   * Get user's wishlist with product details
   */
  async getWishlist(): Promise<WishlistResponse> {
    return api.get<WishlistResponse>(this.baseUrl);
  }

  /**
   * Add product to wishlist
   */
  async addToWishlist(productId: string): Promise<AddToWishlistResponse> {
    const data: AddToWishlistRequest = { productId };
    return api.post<AddToWishlistResponse>(this.baseUrl, data);
  }

  /**
   * Remove product from wishlist
   */
  async removeFromWishlist(productId: string): Promise<RemoveFromWishlistResponse> {
    return api.delete<RemoveFromWishlistResponse>(`${this.baseUrl}/${productId}`);
  }

  /**
   * Toggle product in wishlist (add if not present, remove if present)
   */
  async toggleWishlist(productId: string, isInWishlist: boolean): Promise<void> {
    if (isInWishlist) {
      await this.removeFromWishlist(productId);
    } else {
      await this.addToWishlist(productId);
    }
  }

  /**
   * Check if product is in wishlist
   */
  async checkWishlist(productId: string): Promise<CheckWishlistResponse> {
    return api.get<CheckWishlistResponse>(`${this.baseUrl}/check/${productId}`);
  }

  /**
   * Get wishlist item count
   */
  async getWishlistCount(): Promise<WishlistCountResponse> {
    return api.get<WishlistCountResponse>(`${this.baseUrl}/count`);
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist(): Promise<ClearWishlistResponse> {
    return api.delete<ClearWishlistResponse>(this.baseUrl);
  }

  /**
   * Check if product is in wishlist (returns boolean)
   */
  async isInWishlist(productId: string): Promise<boolean> {
    try {
      const response = await this.checkWishlist(productId);
      return response.data.isInWishlist;
    } catch (error) {
      console.error('Error checking wishlist:', error);
      return false;
    }
  }
}

export const wishlistService = new WishlistService();
export default wishlistService;
