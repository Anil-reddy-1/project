/**
 * SavedItemsSection Component
 * Collapsible section displaying saved for later items
 */

import { useState } from 'react';
import { Bookmark, ChevronDown, ChevronUp } from 'lucide-react';
import { SavedItemCard } from './SavedItemCard';
import type { SavedItem } from '../../types/cart.types';

interface SavedItemsSectionProps {
  savedItems: SavedItem[];
  onMoveToCart: (productId: string) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  onMoveToWishlist: (productId: string) => Promise<void>;
  initiallyExpanded?: boolean;
}

export function SavedItemsSection({
  savedItems,
  onMoveToCart,
  onRemove,
  onMoveToWishlist,
  initiallyExpanded = true,
}: SavedItemsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Don't render if no saved items
  if (savedItems.length === 0) {
    return null;
  }

  return (
    <div className="shop-card overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className={`w-full px-5 sm:px-6 py-4 flex items-center justify-between gap-3 hover:bg-ivory-50 transition-colors ${
          isExpanded ? 'border-b border-ivory-200' : ''
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center text-brass-600">
            <Bookmark className="w-4 h-4" />
          </div>
          <div className="text-left">
            <h2 className="shop-heading text-lg">Saved for later</h2>
            <p className="text-xs text-stone-500">
              {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-ink-500">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Content - Expandable */}
      {isExpanded && (
        <div className="p-4 sm:p-6 bg-ivory-50/60">
          <div className="space-y-3">
            {savedItems.map((item) => (
              <SavedItemCard
                key={item.savedItemId}
                item={item}
                onMoveToCart={onMoveToCart}
                onRemove={onRemove}
                onMoveToWishlist={onMoveToWishlist}
              />
            ))}
          </div>

          {/* Summary Footer */}
          <div className="mt-6 pt-5 border-t border-ivory-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-stone-500">Total saved items</span>
              <span className="font-medium text-ink tabular-nums">
                {savedItems.length}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-2 leading-relaxed">
              Items saved here won't be included in your order. Move them back to cart when you're ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
