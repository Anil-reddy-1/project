/**
 * Product Service
 * API calls for product management
 */

import { api } from './api.service';
import type {
  CreateProductData,
  UpdateProductData,
  ProductFilters,
  ProductListResponse,
  ProductResponse,
  ProductStatsResponse,
  BulkStatusUpdate,
  BulkStatusResponse,
  CategoryTagsResponse,
  LowStockResponse,
  ImageReorder
} from '../types/product.types';

class ProductService {
  private readonly baseUrl = '/products';

  /**
   * Get all products (admin view with all filters)
   */
  async getAllProducts(filters?: ProductFilters): Promise<ProductListResponse> {
    const params = this.buildQueryParams(filters);
    return api.get<ProductListResponse>(`${this.baseUrl}/admin/all`, params);
  }

  /**
   * Get active products only (buyer view)
   */
  async getActiveProducts(filters?: ProductFilters): Promise<ProductListResponse> {
    const params = this.buildQueryParams(filters);
    return api.get<ProductListResponse>(`${this.baseUrl}/buyer`, params);
  }

  /**
   * Get single product by ID
   */
  async getProductById(id: string): Promise<ProductResponse> {
    return api.get<ProductResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Create new product with optional images
   */
  async createProduct(data: CreateProductData, images?: File[]): Promise<ProductResponse> {
    const formData = new FormData();
    
    // Append product data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'categoryTags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    // Append images if provided
    if (images && images.length > 0) {
      images.forEach((image) => {
        formData.append('images', image);
      });
      
      // DEBUG LOGGING - Bug Condition Exploration Test
      console.log('=== PRODUCT SERVICE DEBUG ===');
      console.log('FormData constructed with images:', {
        imageCount: images.length,
        images: images.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          lastModified: f.lastModified
        }))
      });
      
      // Log FormData entries
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }
      console.log('=== END DEBUG ===');
    }
    
    return api.post<ProductResponse>(this.baseUrl, formData);
  }

  /**
   * Update product with optional new images
   */
  async updateProduct(
    id: string, 
    data: UpdateProductData, 
    newImages?: File[]
  ): Promise<ProductResponse> {
    const formData = new FormData();
    
    // Append update data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'categoryTags' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    // Append new images if provided
    if (newImages && newImages.length > 0) {
      newImages.forEach((image) => {
        formData.append('images', image);
      });
    }
    
    return api.put<ProductResponse>(`${this.baseUrl}/${id}`, formData);
  }

  /**
   * Delete product (soft delete - set status to inactive)
   */
  async deleteProduct(id: string): Promise<ProductResponse> {
    return api.delete<ProductResponse>(`${this.baseUrl}/${id}`);
  }

  /**
   * Bulk update product status
   */
  async bulkUpdateStatus(data: BulkStatusUpdate): Promise<BulkStatusResponse> {
    return api.patch<BulkStatusResponse>(`${this.baseUrl}/bulk/status`, data);
  }

  /**
   * Get product statistics
   */
  async getProductStats(): Promise<ProductStatsResponse> {
    return api.get<ProductStatsResponse>(`${this.baseUrl}/stats/dashboard`);
  }

  /**
   * Get low stock products (quantity <= minStock)
   */
  async getLowStockProducts(): Promise<LowStockResponse> {
    return api.get<LowStockResponse>(`${this.baseUrl}/alerts/low-stock`);
  }

  /**
   * Get all category tags
   */
  async getCategoryTags(): Promise<CategoryTagsResponse> {
    return api.get<CategoryTagsResponse>(`${this.baseUrl}/categories`);
  }

  /**
   * Export products to CSV
   */
  async exportProducts(filters?: ProductFilters): Promise<Blob> {
    const params = this.buildQueryParams(filters);
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000/api/v1';
    const response = await fetch(
      `${backendUrl}${this.baseUrl}/export/csv?${new URLSearchParams(params as any).toString()}`,
      {
        headers: {
          'Authorization': `Bearer ${await this.getAuthToken()}`
        }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to export products');
    }
    
    return response.blob();
  }

  /**
   * Delete product image
   */
  async deleteProductImage(productId: string, imageId: string): Promise<void> {
    return api.delete(`${this.baseUrl}/${productId}/images/${imageId}`);
  }

  /**
   * Set image as primary
   */
  async setPrimaryImage(productId: string, imageId: string): Promise<void> {
    return api.patch(`${this.baseUrl}/${productId}/images/${imageId}/primary`);
  }

  /**
   * Reorder product images
   */
  async reorderImages(productId: string, imageOrder: ImageReorder[]): Promise<void> {
    return api.put(`${this.baseUrl}/${productId}/images/reorder`, { imageOrder });
  }

  /**
   * Build query parameters from filters
   */
  private buildQueryParams(filters?: ProductFilters): Record<string, any> {
    if (!filters) return {};
    
    const params: Record<string, any> = {};
    
    if (filters.page) params.page = filters.page;
    if (filters.limit) params.limit = filters.limit;
    if (filters.search) params.search = filters.search;
    if (filters.status) params.status = filters.status;
    if (filters.priceMin !== undefined) params.priceMin = filters.priceMin;
    if (filters.priceMax !== undefined) params.priceMax = filters.priceMax;
    if (filters.stockStatus && filters.stockStatus !== 'all') params.stockStatus = filters.stockStatus;
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;
    
    if (filters.categoryTags && filters.categoryTags.length > 0) {
      params.categoryTags = JSON.stringify(filters.categoryTags);
    }
    
    return params;
  }

  /**
   * Get auth token from Firebase
   */
  private async getAuthToken(): Promise<string> {
    const { auth } = await import('../firebase');
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }
}

export const productService = new ProductService();
export default productService;
