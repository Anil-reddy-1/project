/**
 * Upload Service
 * API calls for image upload to Cloudinary
 */

import { api } from './api.service';
import type {
  UploadImageResponse,
  UploadMultipleImagesResponse,
  DeleteImageResponse,
  UploadProgressCallback
} from '../types/upload.types';

class UploadService {
  private readonly baseUrl = '/uploads';

  /**
   * Upload single image
   */
  async uploadImage(
    file: File, 
    folder: string = 'products',
    onProgress?: UploadProgressCallback
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', folder);
    
    return api.post<UploadImageResponse>(`${this.baseUrl}/image`, formData);
  }

  /**
   * Upload multiple images (up to 10)
   */
  async uploadMultipleImages(
    files: File[], 
    folder: string = 'products',
    onProgress?: UploadProgressCallback
  ): Promise<UploadMultipleImagesResponse> {
    if (files.length > 10) {
      throw new Error('Maximum 10 images allowed');
    }
    
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('images', file);
    });
    formData.append('folder', folder);
    
    return api.post<UploadMultipleImagesResponse>(`${this.baseUrl}/images`, formData);
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<DeleteImageResponse> {
    const encodedPublicId = encodeURIComponent(publicId);
    return api.delete<DeleteImageResponse>(`${this.baseUrl}/image/${encodedPublicId}`);
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'
      };
    }
    
    // Check file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size exceeds 5MB limit.'
      };
    }
    
    return { valid: true };
  }

  /**
   * Validate multiple image files
   */
  validateImageFiles(files: File[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (files.length > 10) {
      errors.push('Maximum 10 images allowed.');
    }
    
    files.forEach((file, index) => {
      const validation = this.validateImageFile(file);
      if (!validation.valid) {
        errors.push(`File ${index + 1}: ${validation.error}`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create image preview URL
   */
  createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Revoke preview URL to free memory
   */
  revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Get file size in human-readable format
   */
  getFileSizeString(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

export const uploadService = new UploadService();
export default uploadService;
