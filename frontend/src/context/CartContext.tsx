import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { CartItem, SavedItem } from '../types/cart.types';
import { cartService } from '../services/cart.service';
import { toast } from '../utils/toast';
import { handleError, validateQuantity } from '../utils/errorHandler';
import { useAuth } from './AuthContext';

// Context interface
interface CartContextType {
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
  isInCart: (productId: string) => boolean;
}

// Create context with undefined default
const CartContext = createContext<CartContextType | undefined>(undefined);

// Provider props
interface CartProviderProps {
  children: ReactNode;
}

/**
 * CartProvider - Global cart state management provider
 * Wraps the application to provide cart functionality throughout
 */
export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get auth state to know when user is authenticated
  const { user, loading: authLoading } = useAuth();

  // Calculate total cart count
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  /**
   * Load cart data from API
   */
  const loadCartData = useCallback(async () => {
    // Don't load if user is not authenticated
    if (!user) {
      setCartItems([]);
      setSavedItems([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const [cartResponse, savedResponse] = await Promise.all([
        cartService.getCart(),
        cartService.getSavedItems()
      ]);

      setCartItems(cartResponse.data.items || []);
      setSavedItems(savedResponse.data.items || []);
    } catch (err) {
      const appError = handleError(err, 'load-cart', undefined, {
        showToast: false, // Don't show toast on initial load
        logToConsole: true,
      });
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load cart only when auth is complete and user is authenticated
  useEffect(() => {
    if (!authLoading) {
      loadCartData();
    }
  }, [authLoading, loadCartData]);

  /**
   * Add item to cart
   */
  const addToCart = useCallback(async (productId: string, quantity: number = 1) => {
    // Validate quantity
    const validationError = validateQuantity(quantity);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    try {
      await cartService.addToCart(productId, quantity);
      await loadCartData();
      toast.success('Product added to cart');
    } catch (err) {
      handleError(err, 'add-to-cart', { productId, quantity });
      throw err;
    }
  }, [loadCartData]);

  /**
   * Update cart item quantity (with optimistic update)
   */
  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    // Validate quantity
    const validationError = validateQuantity(quantity);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const previousItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems(prev => 
        prev.map(item => 
          item.product.id === productId ? { ...item, quantity } : item
        )
      );

      await cartService.updateCartItem(productId, quantity);
      await loadCartData();
    } catch (err) {
      // Rollback on error
      setCartItems(previousItems);
      handleError(err, 'update-quantity', { productId, quantity });
      throw err;
    }
  }, [cartItems, loadCartData]);

  /**
   * Increment quantity by 1
   */
  const incrementQuantity = useCallback(async (productId: string, currentQuantity: number) => {
    await updateQuantity(productId, currentQuantity + 1);
  }, [updateQuantity]);

  /**
   * Decrement quantity by 1 (removes if would be 0)
   */
  const decrementQuantity = useCallback(async (productId: string, currentQuantity: number) => {
    if (currentQuantity <= 1) {
      await removeFromCart(productId);
    } else {
      await updateQuantity(productId, currentQuantity - 1);
    }
  }, [updateQuantity]);

  /**
   * Remove item from cart (with optimistic update)
   */
  const removeFromCart = useCallback(async (productId: string) => {
    const previousItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems(prev => prev.filter(item => item.product.id !== productId));

      await cartService.removeFromCart(productId);
      toast.success('Item removed from cart');
      await loadCartData();
    } catch (err) {
      // Rollback on error
      setCartItems(previousItems);
      handleError(err, 'remove-from-cart', { productId });
      throw err;
    }
  }, [cartItems, loadCartData]);

  /**
   * Clear entire cart (with optimistic update)
   */
  const clearCart = useCallback(async () => {
    const previousItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems([]);

      await cartService.clearCart();
      toast.success('Cart cleared');
      await loadCartData();
    } catch (err) {
      // Rollback on error
      setCartItems(previousItems);
      handleError(err, 'clear-cart');
      throw err;
    }
  }, [cartItems, loadCartData]);

  /**
   * Save item for later (with optimistic update)
   */
  const saveForLater = useCallback(async (productId: string) => {
    const previousCartItems = [...cartItems];
    const previousSavedItems = [...savedItems];
    
    try {
      // Optimistic update - move item from cart to saved
      const itemToSave = cartItems.find(item => item.product.id === productId);
      if (itemToSave) {
        setCartItems(prev => prev.filter(item => item.product.id !== productId));
        setSavedItems(prev => [...prev, {
          savedItemId: '', // Will be set by API
          quantity: itemToSave.quantity,
          savedAt: new Date().toISOString(),
          product: itemToSave.product
        }]);
      }

      await cartService.saveForLater(productId);
      toast.success('Item saved for later');
      await loadCartData();
    } catch (err) {
      // Rollback on error
      setCartItems(previousCartItems);
      setSavedItems(previousSavedItems);
      handleError(err, 'save-for-later', { productId });
      throw err;
    }
  }, [cartItems, savedItems, loadCartData]);

  /**
   * Move saved item back to cart (with optimistic update)
   */
  const moveToCart = useCallback(async (productId: string) => {
    const previousCartItems = [...cartItems];
    const previousSavedItems = [...savedItems];
    
    try {
      // Optimistic update - move item from saved to cart
      const itemToMove = savedItems.find(item => item.product.id === productId);
      if (itemToMove) {
        setSavedItems(prev => prev.filter(item => item.product.id !== productId));
        
        // Check if item already exists in cart
        const existingCartItem = cartItems.find(item => item.product.id === productId);
        if (existingCartItem) {
          // Increment existing item
          setCartItems(prev =>
            prev.map(item =>
              item.product.id === productId
                ? { ...item, quantity: item.quantity + itemToMove.quantity }
                : item
            )
          );
        } else {
          // Add as new cart item
          setCartItems(prev => [...prev, {
            cartItemId: '', // Will be set by API
            quantity: itemToMove.quantity,
            addedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            product: { ...itemToMove.product, hasStockIssue: false }
          }]);
        }
      }

      await cartService.moveToCart(productId);
      toast.success('Item moved to cart');
      await loadCartData();
    } catch (err) {
      // Rollback on error
      setCartItems(previousCartItems);
      setSavedItems(previousSavedItems);
      handleError(err, 'move-to-cart', { productId });
      throw err;
    }
  }, [cartItems, savedItems, loadCartData]);

  /**
   * Remove saved item (with optimistic update)
   */
  const removeSavedItem = useCallback(async (productId: string) => {
    const previousSavedItems = [...savedItems];
    
    try {
      // Optimistic update
      setSavedItems(prev => prev.filter(item => item.product.id !== productId));

      await cartService.removeSavedItem(productId);
      toast.success('Saved item removed');
      await loadCartData();
    } catch (err) {
      // Rollback on error
      setSavedItems(previousSavedItems);
      handleError(err, 'remove-saved-item', { productId });
      throw err;
    }
  }, [savedItems, loadCartData]);

  /**
   * Move cart item to wishlist (with optimistic update)
   */
  const moveToWishlist = useCallback(async (productId: string) => {
    const previousItems = [...cartItems];
    
    try {
      // Optimistic update
      setCartItems(prev => prev.filter(item => item.product.id !== productId));

      await cartService.moveToWishlist(productId);
      toast.success('Item moved to wishlist');
      await loadCartData();
    } catch (err) {
      // Rollback on error
      setCartItems(previousItems);
      handleError(err, 'move-to-wishlist', { productId });
      throw err;
    }
  }, [cartItems, loadCartData]);

  /**
   * Manually refresh cart data
   */
  const refreshCart = useCallback(async () => {
    await loadCartData();
  }, [loadCartData]);

  /**
   * Check if product is in cart
   */
  const isInCart = useCallback((productId: string): boolean => {
    return cartItems.some(item => item.product.id === productId);
  }, [cartItems]);

  // Context value
  const value: CartContextType = {
    cartItems,
    savedItems,
    loading,
    error,
    cartCount,
    addToCart,
    updateQuantity,
    incrementQuantity,
    decrementQuantity,
    removeFromCart,
    clearCart,
    saveForLater,
    moveToCart,
    removeSavedItem,
    moveToWishlist,
    refreshCart,
    isInCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

/**
 * useCart - Hook to access cart context
 * Throws error if used outside CartProvider
 */
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

// Export context for testing purposes
export { CartContext };
