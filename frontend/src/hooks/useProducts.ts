/**
 * useProducts Hook
 * React hook for product data fetching and management
 */

import { useState, useEffect, useCallback } from 'react';
import { productService } from '../services/product.service';
import type { 
  Product, 
  ProductFilters, 
  Pagination, 
  ProductStats 
} from '../types/product.types';

interface UseProductsResult {
  products: Product[];
  loading: boolean;
  error: string | null;
  pagination: Pagination | null;
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useProducts(initialFilters?: ProductFilters, isAdmin: boolean = false): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [filters, setFilters] = useState<ProductFilters | undefined>(initialFilters);

  const fetchProducts = useCallback(async (newFilters?: ProductFilters) => {
    setLoading(true);
    setError(null);
    
    try {
      const filtersToUse = newFilters || filters;
      setFilters(filtersToUse);
      
      const response = isAdmin 
        ? await productService.getAllProducts(filtersToUse)
        : await productService.getActiveProducts(filtersToUse);
      
      setProducts(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [filters, isAdmin]);

  const refetch = useCallback(() => fetchProducts(filters), [fetchProducts, filters]);

  useEffect(() => {
    fetchProducts();
  }, []); // Only run on mount

  return {
    products,
    loading,
    error,
    pagination,
    fetchProducts,
    refetch
  };
}

interface UseProductStatsResult {
  stats: ProductStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProductStats(): UseProductStatsResult {
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await productService.getProductStats();
      setStats(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
}

interface UseProductResult {
  product: Product | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProduct(productId: string): UseProductResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!productId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await productService.getProductById(productId);
      setProduct(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch product');
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  return {
    product,
    loading,
    error,
    refetch: fetchProduct
  };
}
