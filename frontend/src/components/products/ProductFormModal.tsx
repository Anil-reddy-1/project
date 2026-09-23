/**
 * ProductFormModal Component
 * Modal for adding/editing products with image upload
 */

import { useState, useEffect } from 'react';
import { Modal, ActionButton, Input, Label } from '../ui';
import { ImageUploadZone } from './ImageUploadZone';
import { productService } from '../../services';
import type { Product, CreateProductData, UpdateProductData } from '../../types';
import { X } from 'lucide-react';

interface ImageItem {
  id: string;
  file?: File;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  isUploading?: boolean;
  uploadProgress?: number;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: () => void;
}

export function ProductFormModal({
  isOpen,
  onClose,
  product,
  onSaved,
}: ProductFormModalProps) {
  const isEditMode = !!product;

  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    price: '',
    quantity: '',
    unit: 'pcs',
    minStock: '',
    maxStock: '',
    minOrderQuantity: '1',
    status: 'active' as 'active' | 'inactive',
  });

  const [categoryTags, setCategoryTags] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load product data for editing
  useEffect(() => {
    if (isEditMode && product) {
      setFormData({
        sku: product.sku,
        name: product.name,
        description: product.description || '',
        price: product.price.toString(),
        quantity: product.quantity.toString(),
        unit: product.unit,
        minStock: product.minStock.toString(),
        maxStock: product.maxStock?.toString() || '',
        minOrderQuantity: product.minOrderQuantity.toString(),
        status: product.status,
      });
      setCategoryTags(product.categoryTags || []);
      
      // Load existing images
      const existingImages: ImageItem[] = product.images.map((img, idx) => ({
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        displayOrder: img.displayOrder,
      }));
      setImages(existingImages);
    } else {
      // Reset form for new product
      setFormData({
        sku: '',
        name: '',
        description: '',
        price: '',
        quantity: '',
        unit: 'pcs',
        minStock: '',
        maxStock: '',
        minOrderQuantity: '1',
        status: 'active',
      });
      setCategoryTags([]);
      setImages([]);
    }
    setErrors({});
  }, [isEditMode, product, isOpen]);

  // Handle form field change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Handle category tag addition
  const handleAddCategory = () => {
    const trimmed = categoryInput.trim();
    if (trimmed && !categoryTags.includes(trimmed)) {
      setCategoryTags([...categoryTags, trimmed]);
      setCategoryInput('');
    }
  };

  // Handle category tag removal
  const handleRemoveCategory = (category: string) => {
    setCategoryTags(categoryTags.filter((c) => c !== category));
  };

  // Handle category input key press
  const handleCategoryKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCategory();
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price = 'Valid price is required';
    }
    if (!formData.quantity || parseInt(formData.quantity) < 0) {
      newErrors.quantity = 'Valid quantity is required';
    }
    if (!formData.minStock || parseInt(formData.minStock) < 0) {
      newErrors.minStock = 'Valid low stock alert level is required';
    }
    if (!formData.minOrderQuantity || parseInt(formData.minOrderQuantity) <= 0) {
      newErrors.minOrderQuantity = 'Valid minimum order quantity is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Upload new images first
      const newImageFiles = images.filter((img) => img.file).map((img) => img.file!);
      
      // DEBUG LOGGING - Bug Condition Exploration Test
      console.log('=== PRODUCT FORM DEBUG ===');
      console.log('Submitting product with images:', {
        imageCount: newImageFiles.length,
        files: newImageFiles.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          constructor: f.constructor.name
        }))
      });
      console.log('=== END DEBUG ===');
      
      // Prepare product data
      const productData: CreateProductData | UpdateProductData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        unit: formData.unit,
        minStock: parseInt(formData.minStock),
        maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
        minOrderQuantity: parseInt(formData.minOrderQuantity),
        status: formData.status,
        categoryTags: categoryTags.length > 0 ? categoryTags : undefined,
      };

      if (isEditMode && product) {
        // Update existing product
        await productService.updateProduct(product.id, productData, newImageFiles);
      } else {
        // Create new product
        const createData: CreateProductData = {
          sku: formData.sku.trim(),
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: parseFloat(formData.price),
          quantity: parseInt(formData.quantity),
          unit: formData.unit,
          minStock: parseInt(formData.minStock),
          maxStock: formData.maxStock ? parseInt(formData.maxStock) : undefined,
          minOrderQuantity: parseInt(formData.minOrderQuantity),
          status: formData.status,
          categoryTags: categoryTags.length > 0 ? categoryTags : undefined,
        };
        await productService.createProduct(createData, newImageFiles);
      }

      onSaved();
      onClose();
    } catch (error: any) {
      console.error('Failed to save product:', error);
      alert(error.response?.data?.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Edit Product' : 'Add New Product'}
      size="xl"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </ActionButton>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              loading
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {loading ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
          </button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Basic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <Label htmlFor="sku">
                SKU <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sku"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                placeholder="e.g., PROD-001"
                disabled={isEditMode || loading}
                className={errors.sku ? 'border-red-500' : ''}
              />
              {errors.sku && (
                <p className="text-xs text-red-500 mt-1">{errors.sku}</p>
              )}
            </div>

            {/* Product Name */}
            <div>
              <Label htmlFor="name">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Premium Cotton T-Shirt"
                disabled={loading}
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mt-4">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Product description..."
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Category Tags */}
          <div className="mt-4">
            <Label htmlFor="category">Categories</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="category"
                value={categoryInput}
                onChange={(e) => setCategoryInput(e.target.value)}
                onKeyPress={handleCategoryKeyPress}
                placeholder="Add category and press Enter"
                disabled={loading}
              />
              <ActionButton
                type="button"
                variant="secondary"
                onClick={handleAddCategory}
                disabled={loading || !categoryInput.trim()}
              >
                Add
              </ActionButton>
            </div>
            {categoryTags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {categoryTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(tag)}
                      disabled={loading}
                      className="ml-2 hover:text-blue-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stock & Pricing */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Stock & Pricing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <Label htmlFor="price">
                Price <span className="text-red-500">*</span>
              </Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                disabled={loading}
                className={errors.price ? 'border-red-500' : ''}
              />
              {errors.price && (
                <p className="text-xs text-red-500 mt-1">{errors.price}</p>
              )}
            </div>

            {/* Current Stock */}
            <div>
              <Label htmlFor="quantity">
                Current Stock <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                min="0"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
                disabled={loading}
                className={errors.quantity ? 'border-red-500' : ''}
              />
              {errors.quantity && (
                <p className="text-xs text-red-500 mt-1">{errors.quantity}</p>
              )}
            </div>

            {/* Unit */}
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="e.g., pcs, kg, ltr"
                disabled={loading}
              />
            </div>

            {/* Low Stock Alert Level */}
            <div>
              <Label htmlFor="minStock">
                Low Stock Alert Level <span className="text-red-500">*</span>
              </Label>
              <Input
                id="minStock"
                name="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={handleChange}
                placeholder="0"
                disabled={loading}
                className={errors.minStock ? 'border-red-500' : ''}
              />
              {errors.minStock && (
                <p className="text-xs text-red-500 mt-1">{errors.minStock}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Alert when stock falls below this level
              </p>
            </div>

            {/* Max Stock */}
            <div>
              <Label htmlFor="maxStock">Maximum Stock</Label>
              <Input
                id="maxStock"
                name="maxStock"
                type="number"
                min="0"
                value={formData.maxStock}
                onChange={handleChange}
                placeholder="Optional"
                disabled={loading}
              />
            </div>

            {/* Min Order Quantity */}
            <div>
              <Label htmlFor="minOrderQuantity">
                Minimum Order Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="minOrderQuantity"
                name="minOrderQuantity"
                type="number"
                min="1"
                value={formData.minOrderQuantity}
                onChange={handleChange}
                placeholder="1"
                disabled={loading}
                className={errors.minOrderQuantity ? 'border-red-500' : ''}
              />
              {errors.minOrderQuantity && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.minOrderQuantity}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={loading}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Images */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Product Images
          </h3>
          <ImageUploadZone
            images={images}
            onChange={setImages}
            maxImages={10}
            disabled={loading}
          />
        </div>
      </form>
    </Modal>
  );
}
