/**
 * Cart State Management Hook
 * Phase 3: Order Placement & Checkout
 * 
 * Manages shopping cart state with localStorage persistence
 */

'use client';

import { useState, useEffect } from 'react';

export interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  moq?: number;
  imageUrl?: string;
}

interface UseCartReturn {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getItem: (itemId: string) => CartItem | undefined;
}

const CART_STORAGE_KEY = 'shopping_cart';

export function useCart(): UseCartReturn {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setItems(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Failed to load cart from storage:', error);
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      } catch (error) {
        console.error('Failed to save cart to storage:', error);
      }
    }
  }, [items, isInitialized]);

  // Calculate total item count
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate total amount
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Add item to cart
  const addItem = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.itemId === item.itemId);
      
      if (existingItem) {
        // Update quantity if item already in cart
        return prevItems.map((i) =>
          i.itemId === item.itemId
            ? { ...i, quantity: i.quantity + quantity }
            : i
        );
      } else {
        // Add new item
        return [...prevItems, { ...item, quantity }];
      }
    });
  };

  // Remove item from cart
  const removeItem = (itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.itemId !== itemId));
  };

  // Update item quantity
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) =>
        item.itemId === itemId ? { ...item, quantity } : item
      )
    );
  };

  // Clear entire cart
  const clearCart = () => {
    setItems([]);
  };

  // Get specific item
  const getItem = (itemId: string) => {
    return items.find((item) => item.itemId === itemId);
  };

  return {
    items,
    itemCount,
    totalAmount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItem,
  };
}
