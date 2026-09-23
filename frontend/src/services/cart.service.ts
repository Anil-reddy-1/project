/**
 * Cart Service
 * API calls for shopping cart management
 */

import { api } from './api.service';
import type {
  GetCartResponse,
  GetSavedItemsResponse,
  AddToCartRequest,
  AddToCartResponse,
  UpdateCartItemRequest,
  UpdateCartItemResponse,
  RemoveFromCartResponse,
  ClearCartResponse,
  CartCountResponse,
  SaveForLaterResponse,
  MoveToCartResponse,
  RemoveSavedItemResponse,
  MoveToWishlistResponse,
} from '../types/cart.types';

class CartService {
  private readonly baseUrl = '/cart';

  /**
   * Get user's cart with full product details
   */
  async getCart(): Promise<GetCartResponse> {
    return api.get<GetCartResponse>(this.baseUrl);
  }

  /**
   * Add item to cart
   */
  async addToCart(productId: string, quantity: number = 1): Promise<AddToCartResponse> {
    const data: AddToCartRequest = { productId, quantity };
    return api.post<AddToCartResponse>(this.baseUrl, data);
  }

  /**
   * Update cart item quantity
   */
  async updateCartItem(productId: string, quantity: number): Promise<UpdateCartItemResponse> {
    const data: UpdateCartItemRequest = { quantity };
    return api.put<UpdateCartItemResponse>(`${this.baseUrl}/${productId}`, data);
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(productId: string): Promise<RemoveFromCartResponse> {
    return api.delete<RemoveFromCartResponse>(`${this.baseUrl}/${productId}`);
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<ClearCartResponse> {
    return api.delete<ClearCartResponse>(this.baseUrl);
  }

  /**
   * Get cart item count (total quantity)
   */
  async getCartCount(): Promise<CartCountResponse> {
    return api.get<CartCountResponse>(`${this.baseUrl}/count`);
  }

  /**
   * Save cart item for later
   */
  async saveForLater(productId: string): Promise<SaveForLaterResponse> {
    return api.post<SaveForLaterResponse>(`${this.baseUrl}/save-for-later/${productId}`);
  }

  /**
   * Get saved for later items
   */
  async getSavedItems(): Promise<GetSavedItemsResponse> {
    return api.get<GetSavedItemsResponse>(`${this.baseUrl}/saved`);
  }

  /**
   * Move saved item back to cart
   */
  async moveToCart(productId: string): Promise<MoveToCartResponse> {
    return api.post<MoveToCartResponse>(`${this.baseUrl}/move-to-cart/${productId}`);
  }

  /**
   * Remove item from saved for later
   */
  async removeSavedItem(productId: string): Promise<RemoveSavedItemResponse> {
    return api.delete<RemoveSavedItemResponse>(`${this.baseUrl}/saved/${productId}`);
  }

  /**
   * Move cart item to wishlist
   */
  async moveToWishlist(productId: string): Promise<MoveToWishlistResponse> {
    return api.post<MoveToWishlistResponse>(`${this.baseUrl}/move-to-wishlist/${productId}`);
  }

  /**
   * Increment cart item quantity
   */
  async incrementQuantity(productId: string, currentQuantity: number): Promise<UpdateCartItemResponse> {
    return this.updateCartItem(productId, currentQuantity + 1);
  }

  /**
   * Decrement cart item quantity (minimum 1)
   */
  async decrementQuantity(productId: string, currentQuantity: number): Promise<UpdateCartItemResponse | RemoveFromCartResponse> {
    if (currentQuantity <= 1) {
      return this.removeFromCart(productId);
    }
    return this.updateCartItem(productId, currentQuantity - 1);
  }

  /**
   * Get cart count as number (returns 0 on error)
   */
  async getCount(): Promise<number> {
    try {
      const response = await this.getCartCount();
      return response.data.count;
    } catch (error) {
      console.error('Error getting cart count:', error);
      return 0;
    }
  }

  /**
   * Check if cart is empty
   */
  async isEmpty(): Promise<boolean> {
    try {
      const cart = await this.getCart();
      return cart.data.items.length === 0;
    } catch (error) {
      console.error('Error checking if cart is empty:', error);
      return true;
    }
  }
}

export const cartService = new CartService();
export default cartService;
