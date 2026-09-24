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
import { Separator } from '../ui';


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
    <div className={`${sticky ? 'sticky top-6' : ''}`}>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-slate-600" />
            <h2 className="text-lg font-bold text-slate-900">Order Summary</h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Cart Stats */}
          <div className="mb-5">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600">Items in cart:</span>
              <span className="font-semibold text-slate-900">{invoice.itemCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600">Total quantity:</span>
              <span className="font-semibold text-slate-900">{invoice.totalQuantity}</span>
            </div>
          </div>

          <Separator className="my-5" />

          {/* Price Breakdown */}
          <div className="space-y-3 mb-5">
            {/* Subtotal */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Subtotal</span>
              <span className="text-base font-semibold text-slate-900">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            {/* Extra Charge */}
            {invoice.hasExtraCharge && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm text-slate-600">Extra Charge</span>
                  <div className="group relative">
                    <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                      {getChargeExplanation()}
                      <div className="absolute left-3 top-full w-2 h-2 bg-slate-800 transform rotate-45 -mt-1" />
                    </div>
                  </div>
                </div>
                <span className="text-base font-semibold text-red-600">
                  +{formatCurrency(invoice.extraCharge)}
                </span>
              </div>
            )}
          </div>

          <Separator className="my-5" />

          {/* Total */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-lg font-bold text-slate-900">Total</span>
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(invoice.total)}
            </span>
          </div>

          {/* MOQ Violations Warning */}
          {invoice.hasMOQViolations && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">
                    MOQ Warning
                  </p>
                  <p className="text-xs text-amber-700 leading-relaxed">
                    {invoice.warningMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Extra Charge Warning with Hint */}
          {invoice.hasExtraCharge && invoice.hintMessage && (
            <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex gap-2">
                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    Save ₹{invoice.extraCharge}
                  </p>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    {invoice.hintMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stock Issues Warning */}
          {isBlocked && blockReason && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Cannot Checkout
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
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-900">
                    Ready to checkout
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Checkout Button */}
          <motion.button
            onClick={onCheckout}
            disabled={!canCheckout}
            whileHover={canCheckout ? { scale: 1.02 } : {}}
            whileTap={canCheckout ? { scale: 0.98 } : {}}
            className={`w-full py-3 px-4 rounded-lg font-bold text-base transition-all duration-200 ${
              canCheckout
                ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {cartItems.length === 0
              ? 'Cart is Empty'
              : isBlocked
              ? 'Cannot Checkout'
              : 'Proceed to Checkout'}
          </motion.button>

          {/* Info Text */}
          {canCheckout && (
            <p className="text-xs text-slate-500 text-center mt-3">
              You'll review your order before final confirmation
            </p>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Prices are inclusive of all taxes. Shipping charges will be calculated at checkout based on your location.
            </p>
          </div>
        </div>
      </div>

      {/* MOQ Details (if violations exist) */}
      {invoice.hasMOQViolations && invoice.moqViolations.length > 0 && (
        <div className="mt-4 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            <h3 className="text-sm font-semibold text-amber-900">
              Products Below MOQ
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {invoice.moqViolations.map((violation) => (
              <div key={violation.productId} className="text-sm">
                <p className="font-medium text-slate-900 mb-1 line-clamp-1">
                  {violation.productName}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">
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
      <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-2">
          Need Help?
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">
          Have questions about minimum order quantities or bulk pricing? Our team is here to help.
        </p>
        <button className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline">
          Contact Support
        </button>
      </div>
    </div>
  );
}
