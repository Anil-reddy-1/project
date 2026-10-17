/**
 * EmptyCartState Component
 * Displays a friendly empty state when cart has no items
 */

import { ShoppingCart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EmptyCartStateProps {
  title?: string;
  message?: string;
  showShopButton?: boolean;
  shopButtonText?: string;
  shopButtonLink?: string;
}

export function EmptyCartState({
  title = 'Your cart is empty',
  message = "Looks like you haven't added any items to your cart yet. Start shopping to find great products!",
  showShopButton = true,
  shopButtonText = 'Start Shopping',
  shopButtonLink = '/buyer/products',
}: EmptyCartStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
      {/* Icon */}
      <div className="mb-7 w-20 h-20 rounded-full bg-white border border-ivory-300 flex items-center justify-center ring-1 ring-brass-100 ring-offset-4 ring-offset-ivory">
        <ShoppingCart className="w-8 h-8 text-ink" strokeWidth={1.25} />
      </div>

      <p className="shop-eyebrow">Your basket</p>

      {/* Title */}
      <h2 className="shop-title mt-2 mb-3">
        {title}
      </h2>

      {/* Message */}
      <p className="shop-subtitle text-base max-w-md mb-8">
        {message}
      </p>

      {/* Action Button */}
      {showShopButton && (
        <Link
          to={shopButtonLink}
          className="shop-btn-primary"
        >
          {shopButtonText}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}

      {/* Additional Info */}
      <div className="mt-14 w-full max-w-3xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="shop-rule flex-1" />
          <p className="font-display text-sm italic text-ink-500">
            Why shop with us?
          </p>
          <div className="shop-rule flex-1" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          <div className="shop-card p-5">
            <div className="w-9 h-9 rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-brass-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-display text-[15px] font-medium text-ink mb-1">Quality products</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Verified suppliers and authentic products
            </p>
          </div>

          <div className="shop-card p-5">
            <div className="w-9 h-9 rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-brass-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="font-display text-[15px] font-medium text-ink mb-1">Bulk pricing</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Better rates for wholesale orders
            </p>
          </div>

          <div className="shop-card p-5">
            <div className="w-9 h-9 rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center mb-3">
              <svg className="w-4 h-4 text-brass-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="font-display text-[15px] font-medium text-ink mb-1">Fast delivery</p>
            <p className="text-xs text-stone-500 leading-relaxed">
              Quick processing and reliable shipping
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
