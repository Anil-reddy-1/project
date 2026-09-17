/**
 * Product Types & Interfaces
 * TypeScript definitions for product management
 */

// Product image
export interface ProductImage {
  id: string;
  url: string;
  publicId?: string;
  displayOrder: number;
  isPrimary: boolean;
}

// Stock status enum
export type StockStatus = 'healthy' | 'low' | 'out';

// Product status enum
export type ProductStatus = 'active' | 'inactive';

// Product interface
export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryTags: string[];
  quantity: number;
  unit: string;
  minStock: number;
  maxStock?: number;
  minOrderQuantity: number;
  price: number;
  status: ProductStatus;
  primaryImageUrl?: string;
  images: ProductImage[];
  stockStatus?: StockStatus;
  lowStockPercentage?: number;
  createdAt: string;
  updatedAt: string;
}

// Product creation data
export interface CreateProductData {
  sku: string;
  name: string;
  description?: string;
  categoryTags?: string[];
  quantity?: number;
  unit?: string;
  minStock?: number;
  maxStock?: number;
  minOrderQuantity?: number;
  price: number;
  status?: ProductStatus;
}

// Product update data
export interface UpdateProductData {
  name?: string;
  description?: string;
  categoryTags?: string[];
  quantity?: number;
  unit?: string;
  minStock?: number;
  maxStock?: number;
  minOrderQuantity?: number;
  price?: number;
  status?: ProductStatus;
}

// Product filters
export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  categoryTags?: string[];
  status?: ProductStatus;
  priceMin?: number;
  priceMax?: number;
  stockStatus?: StockStatus | 'all';
  sortBy?: 'created_at' | 'name' | 'sku' | 'price' | 'quantity' | 'updated_at';
  sortOrder?: 'ASC' | 'DESC';
}

// Pagination metadata
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// Product list response
export interface ProductListResponse {
  success: boolean;
  message: string;
  data: Product[];
  pagination: Pagination;
}

// Single product response
export interface ProductResponse {
  success: boolean;
  message: string;
  data: Product;
}

// Product stats
export interface ProductStats {
  totalProducts: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryValue: number;
  categoriesCount: number;
}

// Product stats response
export interface ProductStatsResponse {
  success: boolean;
  message: string;
  data: ProductStats;
}

// Bulk status update
export interface BulkStatusUpdate {
  productIds: string[];
  status: ProductStatus;
}

// Bulk status response
export interface BulkStatusResponse {
  success: boolean;
  message: string;
  data: Array<{
    id: string;
    sku: string;
    name: string;
    status: ProductStatus;
  }>;
}

// Image reorder
export interface ImageReorder {
  id: string;
  displayOrder: number;
}

// Category tags response
export interface CategoryTagsResponse {
  success: boolean;
  message: string;
  data: string[];
}

// Low stock products response
export interface LowStockResponse {
  success: boolean;
  message: string;
  data: Product[];
  count: number;
}
