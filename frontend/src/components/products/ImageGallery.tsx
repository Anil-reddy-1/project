/**
 * ImageGallery Component
 * Image gallery with main display and thumbnail navigation
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ProductImage } from '../../types';

interface ImageGalleryProps {
  images: ProductImage[];
  productName: string;
}

export function ImageGallery({ images, productName }: ImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-ivory-100 border border-ivory-200 rounded-2xl flex items-center justify-center">
        <div className="text-center text-stone-400">
          <svg
            className="w-16 h-16 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.25}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]">No image available</p>
        </div>
      </div>
    );
  }

  const sortedImages = [...images].sort((a, b) => a.displayOrder - b.displayOrder);
  const currentImage = sortedImages[selectedIndex];

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? sortedImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === sortedImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative aspect-square bg-white border border-ivory-200 rounded-2xl overflow-hidden group">
        <img
          src={currentImage.url}
          alt={`${productName} - Image ${selectedIndex + 1}`}
          className="w-full h-full object-contain p-4 sm:p-6"
        />

        {/* Navigation Arrows (show only if multiple images) */}
        {sortedImages.length > 1 && (
          <>
            <button
              onClick={handlePrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white border border-ivory-300 hover:border-ink rounded-full text-ink transition-[opacity,border-color] sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white border border-ivory-300 hover:border-ink rounded-full text-ink transition-[opacity,border-color] sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {sortedImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-ink text-ivory-100 px-3 py-1 rounded-full text-[11px] font-semibold tracking-[0.14em] tabular-nums">
            {selectedIndex + 1} / {sortedImages.length}
          </div>
        )}

        {/* Primary Badge */}
        {currentImage.isPrimary && (
          <div className="absolute top-3 left-3 shop-chip">
            Primary
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {sortedImages.length > 1 && (
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {sortedImages.map((image, index) => (
            <button
              key={image.id}
              onClick={() => setSelectedIndex(index)}
              aria-label={`Show image ${index + 1}`}
              aria-current={index === selectedIndex ? 'true' : undefined}
              className={`flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border bg-white transition-[border-color,box-shadow] ${
                index === selectedIndex
                  ? 'border-ink ring-1 ring-ink'
                  : 'border-ivory-300 hover:border-ink-300'
              }`}
            >
              <img
                src={image.url}
                alt={`${productName} - Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Navigation Dots (alternative for mobile) */}
      {sortedImages.length > 1 && (
        <div className="flex justify-center gap-2 sm:hidden">
          {sortedImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`h-1.5 rounded-full transition-all ${
                index === selectedIndex
                  ? 'bg-ink w-6'
                  : 'w-1.5 bg-ivory-300 hover:bg-ink-300'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
