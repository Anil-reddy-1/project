/**
 * InvoiceSidebar Component
 * Displays cart summary, invoice breakdown, MOQ warnings, and checkout button
 */

import { motion } from 'framer-motion';
import { ShoppingCart, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { CartItem } from '../../types/cart.types';
import {
  calculateInvoice,
  formatCurrency,
  getChargeExplanation,
  shouldBlockCheckout,
  getCheckoutBlockReason,
} from '../../utils/cartCalculations';

interface InvoiceSidebarProps {
  cartItems: CartItem[];
  onCheckout: () => void;
  isCheckoutDisabled?: boolean;
  sticky?: boolean;
}

export function InvoiceSidebar({
  cartItems,
  onCheckout,
  isCheckoutDisabled = false,
  sticky = true,
}: InvoiceSidebarProps) {
  const invoice = calculateInvoice(cartItems);
  const isBlocked = shouldBlockCheckout(cartItems);
  const blockReason = getCheckoutBlockReason(cartItems);
  const canCheckout = !isCheckoutDisabled && !isBlocked && cartItems.length > 0;

  return (
    <div className={`${sticky ? 'lg:sticky lg:top-28' : ''}`}>
      <div className="shop-card overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-dashed border-ivory-300">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="shop-eyebrow">Receipt</p>
              <h2 className="shop-heading mt-1.5">Order summary</h2>
            </div>
            <div className="w-9 h-9 rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center text-brass-600">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Cart Stats */}
          <dl className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Items in cart</dt>
              <dd className="font-medium text-ink tabular-nums">{invoice.itemCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-stone-500">Total quantity</dt>
              <dd className="font-medium text-ink tabular-nums">{invoice.totalQuantity}</dd>
            </div>
          </dl>

          <div className="shop-rule my-5" />

          {/* Price Breakdown */}
          <div className="space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-stone-500">Subtotal</span>
              <span className="text-[15px] font-medium text-ink tabular-nums">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            {/* Extra Charge */}
            {invoice.hasExtraCharge && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-stone-500">Extra charge</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-stone-400 cursor-help" aria-label="About the extra charge" />
                    <div className="absolute left-0 bottom-full mb-2 w-60 p-3 bg-ink text-ivory-100 text-xs leading-relaxed rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      {getChargeExplanation()}
                      <div className="absolute left-3 top-full w-2 h-2 bg-ink transform rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>
                <span className="text-[15px] font-medium text-red-600 tabular-nums">
                  +{formatCurrency(invoice.extraCharge)}
                </span>
              </div>
            )}
            {/* Total Savings from MRP */}
            {invoice.totalSavings > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-sm">Discount savings</span>
                <span className="text-[15px] font-medium tabular-nums">
                  -{formatCurrency(invoice.totalSavings)}
                </span>
              </div>
            )}
          </div>

          <div className="shop-rule my-5" />

          {/* Total */}
          <div className="flex items-end justify-between gap-3 mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 pb-1">Total</span>
            <span className="shop-price text-3xl font-medium">
              {formatCurrency(invoice.total)}
            </span>
          </div>
          <p className="text-[11px] text-stone-400 text-right mb-5">Inclusive of all taxes</p>

          {/* Total Savings Banner */}
          {invoice.totalSavings > 0 && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-semibold">
              <span>You save on this order</span>
              <span className="tabular-nums">{formatCurrency(invoice.totalSavings)}</span>
            </div>
          )}

          {/* MOQ Violations Warning */}
          {invoice.hasMOQViolations && (
            <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-0.5">
                    Minimum order not met
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {invoice.warningMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extra Charge Warning with Hint */}
          {invoice.hasExtraCharge && invoice.hintMessage && (
            <div className="mb-4 p-3.5 rounded-xl bg-ivory-50 border border-brass-100">
              <div className="flex gap-2.5">
                <Info className="w-4 h-4 text-brass-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-ink mb-0.5">
                    Save ₹{invoice.extraCharge}
                  </p>
                  <p className="text-xs text-ink-500 leading-relaxed">
                    {invoice.hintMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Issues Warning */}
          {isBlocked && blockReason && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200">
              <div className="flex gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-0.5">
                    Cannot checkout
                  </p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {blockReason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message (No Issues) */}
          {!invoice.hasMOQViolations && !invoice.hasExtraCharge && !isBlocked && cartItems.length > 0 && (
            <div className="mb-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <p className="text-sm font-medium text-emerald-800">
                  Ready to checkout
                </p>
              </div>
            </div>
          )}

          {/* Checkout Button */}
          <motion.button
            onClick={onCheckout}
            disabled={!canCheckout}
            whileTap={canCheckout ? { scale: 0.98 } : {}}
            className={`w-full h-12 px-6 rounded-full text-sm font-semibold tracking-wide transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass-300 ${
              canCheckout
                ? 'bg-ink text-white hover:bg-ink-700'
                : 'bg-ivory-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            {cartItems.length === 0
              ? 'Cart is empty'
              : isBlocked
              ? 'Cannot checkout'
              : 'Proceed to checkout'}
          </motion.button>

          {/* Info Text */}
          {canCheckout && (
            <p className="text-xs text-stone-500 text-center mt-3">
              You'll review your order before final confirmation
            </p>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-ivory-50 border-t border-ivory-200">
          <div className="flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-stone-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-stone-500 leading-relaxed">
              Prices are inclusive of all taxes. Shipping charges will be calculated at checkout based on your location.
            </p>
          </div>
        </div>
      </div>

      {/* MOQ Details (if violations exist) */}
      {invoice.hasMOQViolations && invoice.moqViolations.length > 0 && (
        <div className="mt-4 shop-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-ivory-200 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <h3 className="font-display text-[15px] font-medium text-ink">
              Products below MOQ
            </h3>
          </div>
          <div className="divide-y divide-ivory-200">
            {invoice.moqViolations.map((violation) => (
              <div key={violation.productId} className="px-5 py-3 text-sm">
                <p className="font-medium text-ink mb-1 line-clamp-1">
                  {violation.productName}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs tabular-nums">
                  <span className="text-stone-500">
                    Current: {violation.currentQuantity}
                  </span>
                  <span className="text-amber-700 font-medium">
                    Required: {violation.minOrderQuantity}
                  </span>
                  <span className="text-red-600 font-semibold">
                    Short: {violation.shortage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-4 p-5 rounded-2xl border border-ivory-200 bg-ivory-50">
        <p className="shop-eyebrow">Concierge</p>
        <h3 className="font-display text-base font-medium text-ink mt-1.5 mb-1">
          Need wholesale assistance?
        </h3>
        <p className="text-xs text-stone-500 leading-relaxed mb-3">
          Have questions about bulk orders, payment terms, or freight? Our operations team is ready to help.
        </p>
        <button className="inline-flex items-center gap-1 text-xs font-semibold text-ink underline decoration-brass-300 underline-offset-4 hover:decoration-brass-600 transition-colors">
          Contact support <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
