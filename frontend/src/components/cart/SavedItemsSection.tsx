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
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200"
      >
        <div className="flex items-center gap-3">
          <Bookmark className="w-5 h-5 text-slate-600" />
          <div className="text-left">
            <h2 className="text-lg font-bold text-slate-900">Saved for Later</h2>
            <p className="text-xs text-slate-600">
              {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'} saved
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-600" />
          )}
        </div>
      </button>

      {/* Content - Expandable */}
      {isExpanded && (
        <div className="p-6">
          <div className="space-y-4">
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
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total saved items:</span>
              <span className="font-semibold text-slate-900">
                {savedItems.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Items saved here won't be included in your order. Move them back to cart when you're ready.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
