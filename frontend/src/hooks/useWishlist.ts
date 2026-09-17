/**
 * useWishlist Hook
 * React hook for wishlist data fetching and management
 */

import { useState, useEffect, useCallback } from 'react';
import { wishlistService } from '../services/wishlist.service';
import type { WishlistItem } from '../types/wishlist.types';

interface UseWishlistResult {
  wishlistItems: WishlistItem[];
  wishlistCount: number;
  loading: boolean;
  error: string | null;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  toggleWishlist: (productId: string, isInWishlist: boolean) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useWishlist(): UseWishlistResult {
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [wishlistCount, setWishlistCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await wishlistService.getWishlist();
      setWishlistItems(response.data);
      setWishlistCount(response.count);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch wishlist');
      setWishlistItems([]);
      setWishlistCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToWishlist = useCallback(async (productId: string): Promise<boolean> => {
    try {
      await wishlistService.addToWishlist(productId);
      await fetchWishlist(); // Refresh wishlist
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to add to wishlist');
      return false;
    }
  }, [fetchWishlist]);

  const removeFromWishlist = useCallback(async (productId: string): Promise<boolean> => {
    try {
      await wishlistService.removeFromWishlist(productId);
      await fetchWishlist(); // Refresh wishlist
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to remove from wishlist');
      return false;
    }
  }, [fetchWishlist]);

  const toggleWishlist = useCallback(async (productId: string, currentlyInWishlist: boolean): Promise<boolean> => {
    try {
      await wishlistService.toggleWishlist(productId, currentlyInWishlist);
      await fetchWishlist(); // Refresh wishlist
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to toggle wishlist');
      return false;
    }
  }, [fetchWishlist]);

  const isInWishlist = useCallback((productId: string): boolean => {
    return wishlistItems.some(item => item.product.id === productId);
  }, [wishlistItems]);

  const clearWishlist = useCallback(async (): Promise<boolean> => {
    try {
      await wishlistService.clearWishlist();
      await fetchWishlist(); // Refresh wishlist
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to clear wishlist');
      return false;
    }
  }, [fetchWishlist]);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  return {
    wishlistItems,
    wishlistCount,
    loading,
    error,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
    clearWishlist,
    refetch: fetchWishlist
  };
}

/**
 * Lightweight hook to check wishlist status for a specific product
 */
export function useWishlistStatus(productId: string): {
  isInWishlist: boolean;
  loading: boolean;
  toggle: () => Promise<void>;
} {
  const [isInWishlist, setIsInWishlist] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkStatus = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    try {
      const inWishlist = await wishlistService.isInWishlist(productId);
      setIsInWishlist(inWishlist);
    } catch (err) {
      console.error('Failed to check wishlist status:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const toggle = useCallback(async () => {
    try {
      await wishlistService.toggleWishlist(productId, isInWishlist);
      setIsInWishlist(!isInWishlist);
    } catch (err) {
      console.error('Failed to toggle wishlist:', err);
    }
  }, [productId, isInWishlist]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  return {
    isInWishlist,
    loading,
    toggle
  };
}
