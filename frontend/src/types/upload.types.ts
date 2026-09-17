/**
 * Upload Types & Interfaces
 * TypeScript definitions for image upload functionality
 */

// Uploaded image data
export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

// Single image upload response
export interface UploadImageResponse {
  success: boolean;
  message: string;
  data: UploadedImage;
}

// Multiple images upload response
export interface UploadMultipleImagesResponse {
  success: boolean;
  message: string;
  data: UploadedImage[];
}

// Delete image response
export interface DeleteImageResponse {
  success: boolean;
  message: string;
  data: {
    publicId: string;
  };
}

// Upload progress callback
export type UploadProgressCallback = (progress: number) => void;
