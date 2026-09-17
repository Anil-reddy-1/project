/**
 * ProductFilters Component
 * Advanced filtering UI for products (category, price range, status)
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ActionButton } from '../ui';
import type { ProductFilters as ProductFiltersType, ProductStatus } from '../../types';
import { productService } from '../../services';

interface ProductFiltersProps {
  filters: ProductFiltersType;
  onChange: (filters: Partial<ProductFiltersType>) => void;
}

export function ProductFilters({ filters, onChange }: ProductFiltersProps) {
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    filters.categoryTags || []
  );
  const [priceMin, setPriceMin] = useState<string>(
    filters.priceMin?.toString() || ''
  );
  const [priceMax, setPriceMax] = useState<string>(
    filters.priceMax?.toString() || ''
  );
  const [productStatus, setProductStatus] = useState<ProductStatus | 'all'>(
    filters.status || 'all'
  );

  // Fetch available categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await productService.getCategoryTags();
        setAvailableCategories(response.data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Handle category toggle
  const handleCategoryToggle = (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    
    setSelectedCategories(newCategories);
  };

  // Handle apply filters
  const handleApplyFilters = () => {
    onChange({
      categoryTags: selectedCategories.length > 0 ? selectedCategories : undefined,
      priceMin: priceMin ? parseFloat(priceMin) : undefined,
      priceMax: priceMax ? parseFloat(priceMax) : undefined,
      status: productStatus === 'all' ? undefined : productStatus,
    });
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setSelectedCategories([]);
    setPriceMin('');
    setPriceMax('');
    setProductStatus('all');
    onChange({
      categoryTags: undefined,
      priceMin: undefined,
      priceMax: undefined,
      status: undefined,
    });
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || priceMin || priceMax || productStatus !== 'all';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      {/* Category Tags Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Categories
        </label>
        <div className="flex flex-wrap gap-2">
          {availableCategories.length > 0 ? (
            availableCategories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleCategoryToggle(category)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategories.includes(category)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
                {selectedCategories.includes(category) && (
                  <X className="inline-block w-3 h-3 ml-1" />
                )}
              </button>
            ))
          ) : (
            <p className="text-sm text-gray-500">No categories available</p>
          )}
        </div>
      </div>

      {/* Price Range Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Price Range
        </label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Min Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">Max Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="9999.99"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Product Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Product Status
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setProductStatus('all')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              productStatus === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setProductStatus('active')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              productStatus === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            type="button"
            onClick={() => setProductStatus('inactive')}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              productStatus === 'inactive'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <ActionButton
          variant="primary"
          onClick={handleApplyFilters}
          className="flex-1"
        >
          Apply Filters
        </ActionButton>
        {hasActiveFilters && (
          <ActionButton
            variant="secondary"
            onClick={handleClearFilters}
            className="flex-1"
          >
            Clear All
          </ActionButton>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full"
              >
                {category}
              </span>
            ))}
            {(priceMin || priceMax) && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                Price: {priceMin || '0'} - {priceMax || '∞'}
              </span>
            )}
            {productStatus !== 'all' && (
              <span className="inline-flex items-center px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full capitalize">
                {productStatus}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
