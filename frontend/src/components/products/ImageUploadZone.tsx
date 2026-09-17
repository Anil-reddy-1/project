/**
 * ImageUploadZone Component
 * Drag-drop image upload with preview, reorder, and primary selection
 */

import { useState, useCallback, useRef } from 'react';
import { X, Upload, Star, GripVertical } from 'lucide-react';
import { uploadService } from '../../services';

interface ImageItem {
  id: string;
  file?: File;
  url: string;
  isPrimary: boolean;
  displayOrder: number;
  isUploading?: boolean;
  uploadProgress?: number;
}

interface ImageUploadZoneProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export function ImageUploadZone({
  images,
  onChange,
  maxImages = 10,
  disabled = false,
}: ImageUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || disabled) return;

      const fileArray = Array.from(files);
      const remainingSlots = maxImages - images.length;

      if (fileArray.length > remainingSlots) {
        alert(`Maximum ${maxImages} images allowed. You can add ${remainingSlots} more.`);
        return;
      }

      // Validate files
      const validation = uploadService.validateImageFiles(fileArray);
      if (!validation.valid) {
        alert(validation.errors.join('\n'));
        return;
      }

      // Create preview images
      const newImages: ImageItem[] = fileArray.map((file, index) => ({
        id: `temp-${Date.now()}-${index}`,
        file,
        url: uploadService.createPreviewUrl(file),
        isPrimary: images.length === 0 && index === 0, // First image is primary if no existing images
        displayOrder: images.length + index,
        isUploading: false,
      }));

      onChange([...images, ...newImages]);
    },
    [images, onChange, maxImages, disabled]
  );

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFiles]
  );

  // Remove image
  const handleRemoveImage = useCallback(
    (index: number) => {
      const imageToRemove = images[index];
      
      // Revoke preview URL if it's a local file
      if (imageToRemove.file) {
        uploadService.revokePreviewUrl(imageToRemove.url);
      }

      const newImages = images.filter((_, i) => i !== index);

      // If removed image was primary, make first image primary
      if (imageToRemove.isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }

      // Update display orders
      const reorderedImages = newImages.map((img, idx) => ({
        ...img,
        displayOrder: idx,
      }));

      onChange(reorderedImages);
    },
    [images, onChange]
  );

  // Set primary image
  const handleSetPrimary = useCallback(
    (index: number) => {
      const updatedImages = images.map((img, idx) => ({
        ...img,
        isPrimary: idx === index,
      }));
      onChange(updatedImages);
    },
    [images, onChange]
  );

  // Drag start for reordering
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  // Drag enter for reordering
  const handleDragEnter = useCallback(
    (index: number) => {
      if (draggedIndex === null || draggedIndex === index) return;

      const newImages = [...images];
      const draggedImage = newImages[draggedIndex];
      newImages.splice(draggedIndex, 1);
      newImages.splice(index, 0, draggedImage);

      // Update display orders
      const reorderedImages = newImages.map((img, idx) => ({
        ...img,
        displayOrder: idx,
      }));

      setDraggedIndex(index);
      onChange(reorderedImages);
    },
    [draggedIndex, images, onChange]
  );

  // Drag end for reordering
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {images.length < maxImages && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            onChange={handleFileInputChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="flex flex-col items-center gap-2">
            <Upload className="w-12 h-12 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-700">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF, WebP up to 5MB (Max {maxImages} images)
              </p>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {images.length} / {maxImages} images uploaded
            </p>
          </div>
        </div>
      )}

      {/* Image Preview Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all ${
                image.isPrimary
                  ? 'border-blue-500 ring-2 ring-blue-200'
                  : 'border-gray-200 hover:border-gray-300'
              } ${draggedIndex === index ? 'opacity-50' : ''} ${
                disabled ? 'cursor-not-allowed' : 'cursor-move'
              }`}
            >
              {/* Drag Handle */}
              {!disabled && (
                <div className="absolute top-2 left-2 z-10 bg-black/50 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-4 h-4 text-white" />
                </div>
              )}

              {/* Primary Badge */}
              {image.isPrimary && (
                <div className="absolute top-2 right-2 z-10 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-current" />
                  Primary
                </div>
              )}

              {/* Image */}
              <div className="aspect-square bg-gray-100">
                <img
                  src={image.url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Uploading Progress */}
              {image.isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-white text-sm">
                    Uploading... {image.uploadProgress || 0}%
                  </div>
                </div>
              )}

              {/* Actions Overlay */}
              {!disabled && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                  {!image.isPrimary && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetPrimary(index);
                      }}
                      className="bg-white/90 hover:bg-white text-gray-800 p-2 rounded-full transition-colors"
                      title="Set as primary"
                    >
                      <Star className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveImage(index);
                    }}
                    className="bg-red-500/90 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
                    title="Remove image"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Text */}
      {images.length > 0 && (
        <p className="text-xs text-gray-500 text-center">
          Drag images to reorder • Click star to set primary • First image is shown by default
        </p>
      )}
    </div>
  );
}
