/**
 * Product Utility Functions
 * Helper functions for product-related operations
 */

import type { Product, StockStatus } from '../types/product.types';

/**
 * Format price with currency symbol
 */
export function formatPrice(price: number, currency: string = '₹'): string {
  return `${currency}${price.toFixed(2)}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

/**
 * Get stock status badge color
 */
export function getStockStatusColor(status: StockStatus): string {
  switch (status) {
    case 'healthy':
      return 'green';
    case 'low':
      return 'orange';
    case 'out':
      return 'red';
    default:
      return 'gray';
  }
}

/**
 * Get stock status label
 */
export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'healthy':
      return 'In Stock';
    case 'low':
      return 'Low Stock';
    case 'out':
      return 'Out of Stock';
    default:
      return 'Unknown';
  }
}

/**
 * Check if product can be ordered
 */
export function canOrderProduct(product: Product, quantity: number): {
  canOrder: boolean;
  reason?: string;
} {
  // Check if product is active
  if (product.status !== 'active') {
    return { canOrder: false, reason: 'Product is not available' };
  }

  // Check if out of stock
  if (product.quantity === 0) {
    return { canOrder: false, reason: 'Product is out of stock' };
  }

  // Check if sufficient quantity available
  if (quantity > product.quantity) {
    return { canOrder: false, reason: `Only ${product.quantity} units available` };
  }

  // Check minimum order quantity
  if (quantity < product.minOrderQuantity) {
    return { 
      canOrder: false, 
      reason: `Minimum order quantity is ${product.minOrderQuantity}` 
    };
  }

  return { canOrder: true };
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(originalPrice: number, salePrice: number): number {
  if (originalPrice <= 0) return 0;
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Get primary image URL with fallback
 */
export function getPrimaryImageUrl(product: Product, fallback?: string): string {
  if (product.primaryImageUrl) {
    return product.primaryImageUrl;
  }
  
  if (product.images && product.images.length > 0) {
    const primaryImage = product.images.find(img => img.isPrimary);
    return primaryImage?.url || product.images[0].url;
  }
  
  return fallback || '/placeholder-product.png';
}

/**
 * Search products by text (client-side filtering)
 */
export function filterProductsBySearch(products: Product[], searchText: string): Product[] {
  if (!searchText.trim()) return products;
  
  const search = searchText.toLowerCase();
  
  return products.filter(product => 
    product.name.toLowerCase().includes(search) ||
    product.sku.toLowerCase().includes(search) ||
    product.description?.toLowerCase().includes(search) ||
    product.categoryTags.some(tag => tag.toLowerCase().includes(search))
  );
}

/**
 * Filter products by category
 */
export function filterProductsByCategory(products: Product[], category: string): Product[] {
  if (!category || category === 'all') return products;
  
  return products.filter(product => 
    product.categoryTags.includes(category)
  );
}

/**
 * Filter products by price range
 */
export function filterProductsByPriceRange(
  products: Product[], 
  minPrice?: number, 
  maxPrice?: number
): Product[] {
  return products.filter(product => {
    if (minPrice !== undefined && product.price < minPrice) return false;
    if (maxPrice !== undefined && product.price > maxPrice) return false;
    return true;
  });
}

/**
 * Sort products by field
 */
export function sortProducts(
  products: Product[], 
  sortBy: 'name' | 'price' | 'quantity' | 'created_at',
  order: 'asc' | 'desc' = 'asc'
): Product[] {
  const sorted = [...products].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'price':
        comparison = a.price - b.price;
        break;
      case 'quantity':
        comparison = a.quantity - b.quantity;
        break;
      case 'created_at':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
    }
    
    return order === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

/**
 * Group products by category
 */
export function groupProductsByCategory(products: Product[]): Record<string, Product[]> {
  const grouped: Record<string, Product[]> = {};
  
  products.forEach(product => {
    product.categoryTags.forEach(category => {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(product);
    });
  });
  
  return grouped;
}

/**
 * Calculate total inventory value
 */
export function calculateInventoryValue(products: Product[]): number {
  return products.reduce((total, product) => {
    return total + (product.price * product.quantity);
  }, 0);
}

/**
 * Get unique category tags from products
 */
export function getUniqueCategoryTags(products: Product[]): string[] {
  const tags = new Set<string>();
  
  products.forEach(product => {
    product.categoryTags.forEach(tag => tags.add(tag));
  });
  
  return Array.from(tags).sort();
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/**
 * Format date to readable string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Validate SKU format (alphanumeric with hyphens)
 */
export function isValidSKU(sku: string): boolean {
  const skuRegex = /^[A-Z0-9-]+$/;
  return skuRegex.test(sku);
}

/**
 * Generate SKU suggestion from product name
 */
export function generateSKU(productName: string, prefix: string = 'PROD'): string {
  const cleaned = productName
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('-');
  
  const timestamp = Date.now().toString().slice(-4);
  
  return `${prefix}-${cleaned}-${timestamp}`;
}
