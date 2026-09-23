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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        {/* Background Circle */}
        <div className="absolute inset-0 bg-blue-100 rounded-full blur-2xl opacity-50" />
        
        {/* Icon Container */}
        <div className="relative w-24 h-24 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
          <ShoppingCart className="w-12 h-12 text-blue-600" strokeWidth={1.5} />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-slate-900 mb-3">
        {title}
      </h2>

      {/* Message */}
      <p className="text-base text-slate-600 max-w-md mb-8 leading-relaxed">
        {message}
      </p>

      {/* Action Button */}
      {showShopButton && (
        <Link
          to={shopButtonLink}
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 hover:shadow-lg transition-all duration-200 active:scale-[0.98]"
        >
          {shopButtonText}
          <ArrowRight className="w-5 h-5" />
        </Link>
      )}

      {/* Additional Info */}
      <div className="mt-12 pt-8 border-t border-slate-200 max-w-2xl">
        <p className="text-sm font-semibold text-slate-900 mb-4">
          Why shop with us?
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900">Quality Products</span>
            </div>
            <p className="text-xs text-slate-600">
              Verified suppliers and authentic products
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900">Bulk Pricing</span>
            </div>
            <p className="text-xs text-slate-600">
              Better rates for wholesale orders
            </p>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-slate-900">Fast Delivery</span>
            </div>
            <p className="text-xs text-slate-600">
              Quick processing and reliable shipping
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
