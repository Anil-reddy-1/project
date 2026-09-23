/**
 * useCart Hook
 * Custom hook for cart state management with optimistic updates
 */

import { useState, useCallback, useEffect } from 'react';
import { cartService } from '../services/cart.service';
import { showSuccessToast, showErrorToast } from '../utils/toast';
import type { CartItem, SavedItem } from '../types/cart.types';

interface UseCartReturn {
  // State
  cartItems: CartItem[];
  savedItems: SavedItem[];
  loading: boolean;
  error: string | null;
  cartCount: number;
  
  // Cart operations
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  incrementQuantity: (productId: string, currentQuantity: number) => Promise<void>;
  decrementQuantity: (productId: string, currentQuantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  
  // Saved for later operations
  saveForLater: (productId: string) => Promise<void>;
  moveToCart: (productId: string) => Promise<void>;
  removeSavedItem: (productId: string) => Promise<void>;
  
  // Other operations
  moveToWishlist: (productId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  
  // Utility
  isInCart: (productId: string) => boolean;
}

export function useCart(): UseCartReturn {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Computed cart count
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  /**
   * Fetch cart data from server
   */
  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [cartResponse, savedResponse] = await Promise.all([
        cartService.getCart(),
        cartService.getSavedItems(),
      ]);
      
      setCartItems(cartResponse.data.items);
      setSavedItems(savedResponse.data.items);
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to load cart';
      setError(errorMessage);
      console.error('Error fetching cart:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Refresh cart (alias for fetchCart)
   */
  const refreshCart = useCallback(async () => {
    await fetchCart();
  }, [fetchCart]);

  /**
   * Add item to cart with optimistic update
   */
  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    try {
      // Call API
      await cartService.addToCart(productId, quantity);
      
      // Refresh cart to get updated data
      await fetchCart();
      
      showSuccessToast('Product added to cart');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to add product to cart';
      showErrorToast(errorMessage);
      console.error('Error adding to cart:', err);
      throw err;
    }
  }, [fetchCart]);

  /**
   * Update item quantity with optimistic update
   */
  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    // Store previous state for rollback
    const previousItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems(items =>
        items.map(item =>
          item.product.id === productId
            ? { ...item, quantity }
            : item
        )
      );
      
      // Call API
      await cartService.updateCartItem(productId, quantity);
      
      // Refresh to ensure sync
      await fetchCart();
    } catch (err: any) {
      // Rollback on error
      setCartItems(previousItems);
      
      const errorMessage = err?.message || 'Failed to update quantity';
      showErrorToast(errorMessage);
      console.error('Error updating quantity:', err);
      throw err;
    }
  }, [cartItems, fetchCart]);

  /**
   * Increment quantity by 1
   */
  const incrementQuantity = useCallback(async (productId: string, currentQuantity: number) => {
    await updateQuantity(productId, currentQuantity + 1);
  }, [updateQuantity]);

  /**
   * Decrement quantity by 1 (removes if quantity would be 0)
   */
  const decrementQuantity = useCallback(async (productId: string, currentQuantity: number) => {
    if (currentQuantity <= 1) {
      await removeFromCart(productId);
    } else {
      await updateQuantity(productId, currentQuantity - 1);
    }
  }, [updateQuantity]);

  /**
   * Remove item from cart with optimistic update
   */
  const removeFromCart = useCallback(async (productId: string) => {
    // Store previous state for rollback
    const previousItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems(items => items.filter(item => item.product.id !== productId));
      
      // Call API
      await cartService.removeFromCart(productId);
      
      showSuccessToast('Item removed from cart');
    } catch (err: any) {
      // Rollback on error
      setCartItems(previousItems);
      
      const errorMessage = err?.message || 'Failed to remove item';
      showErrorToast(errorMessage);
      console.error('Error removing from cart:', err);
      throw err;
    }
  }, [cartItems]);

  /**
   * Clear entire cart
   */
  const clearCart = useCallback(async () => {
    // Store previous state for rollback
    const previousItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems([]);
      
      // Call API
      await cartService.clearCart();
      
      showSuccessToast('Cart cleared');
    } catch (err: any) {
      // Rollback on error
      setCartItems(previousItems);
      
      const errorMessage = err?.message || 'Failed to clear cart';
      showErrorToast(errorMessage);
      console.error('Error clearing cart:', err);
      throw err;
    }
  }, [cartItems]);

  /**
   * Save item for later
   */
  const saveForLater = useCallback(async (productId: string) => {
    const previousCartItems = [...cartItems];
    const previousSavedItems = [...savedItems];
    
    try {
      // Find the item being moved
      const item = cartItems.find(i => i.product.id === productId);
      
      if (item) {
        // Optimistic update
        setCartItems(items => items.filter(i => i.product.id !== productId));
        setSavedItems(items => [
          ...items,
          {
            savedItemId: item.cartItemId,
            quantity: item.quantity,
            savedAt: new Date().toISOString(),
            product: item.product,
          },
        ]);
      }
      
      // Call API
      await cartService.saveForLater(productId);
      
      // Refresh to ensure sync
      await fetchCart();
      
      showSuccessToast('Item saved for later');
    } catch (err: any) {
      // Rollback on error
      setCartItems(previousCartItems);
      setSavedItems(previousSavedItems);
      
      const errorMessage = err?.message || 'Failed to save item';
      showErrorToast(errorMessage);
      console.error('Error saving for later:', err);
      throw err;
    }
  }, [cartItems, savedItems, fetchCart]);

  /**
   * Move saved item back to cart
   */
  const moveToCart = useCallback(async (productId: string) => {
    const previousCartItems = [...cartItems];
    const previousSavedItems = [...savedItems];
    
    try {
      // Find the item being moved
      const item = savedItems.find(i => i.product.id === productId);
      
      if (item) {
        // Optimistic update
        setSavedItems(items => items.filter(i => i.product.id !== productId));
        // Don't add to cart items optimistically - let API handle merge
      }
      
      // Call API
      await cartService.moveToCart(productId);
      
      // Refresh to get merged cart
      await fetchCart();
      
      showSuccessToast('Item moved to cart');
    } catch (err: any) {
      // Rollback on error
      setCartItems(previousCartItems);
      setSavedItems(previousSavedItems);
      
      const errorMessage = err?.message || 'Failed to move item to cart';
      showErrorToast(errorMessage);
      console.error('Error moving to cart:', err);
      throw err;
    }
  }, [cartItems, savedItems, fetchCart]);

  /**
   * Remove saved item
   */
  const removeSavedItem = useCallback(async (productId: string) => {
    const previousSavedItems = [...savedItems];
    
    try {
      // Optimistic update
      setSavedItems(items => items.filter(i => i.product.id !== productId));
      
      // Call API
      await cartService.removeSavedItem(productId);
      
      showSuccessToast('Saved item removed');
    } catch (err: any) {
      // Rollback on error
      setSavedItems(previousSavedItems);
      
      const errorMessage = err?.message || 'Failed to remove saved item';
      showErrorToast(errorMessage);
      console.error('Error removing saved item:', err);
      throw err;
    }
  }, [savedItems]);

  /**
   * Move cart item to wishlist
   */
  const moveToWishlist = useCallback(async (productId: string) => {
    const previousCartItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems(items => items.filter(i => i.product.id !== productId));
      
      // Call API
      await cartService.moveToWishlist(productId);
      
      showSuccessToast('Item moved to wishlist');
    } catch (err: any) {
      // Rollback on error
      setCartItems(previousCartItems);
      
      const errorMessage = err?.message || 'Failed to move item to wishlist';
      showErrorToast(errorMessage);
      console.error('Error moving to wishlist:', err);
      throw err;
    }
  }, [cartItems]);

  /**
   * Check if product is in cart
   */
  const isInCart = useCallback((productId: string): boolean => {
    return cartItems.some(item => item.product.id === productId);
  }, [cartItems]);

  // Fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  return {
    // State
    cartItems,
    savedItems,
    loading,
    error,
    cartCount,
    
    // Cart operations
    addToCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
    clearCart,
    
    // Saved for later operations
    saveForLater,
    moveToCart,
    removeSavedItem,
    
    // Other operations
    moveToWishlist,
    refreshCart,
    
    // Utility
    isInCart,
  };
}

export default useCart;
