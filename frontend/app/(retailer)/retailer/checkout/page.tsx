/**
 * Checkout Page
 * Complete checkout flow with address, payment method, and order placement
 */

'use client';

import { useState } from 'react';
import { useCheckout } from '@/hooks';
import { CheckoutSummary } from '@/components/retailer/checkout/CheckoutSummary';
import { AddressSelection } from '@/components/retailer/checkout/AddressSelection';
import { AddressForm } from '@/components/retailer/checkout/AddressForm';
import { PaymentMethodSelector } from '@/components/retailer/checkout/PaymentMethodSelector';

export default function CheckoutPage() {
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [savedAddresses] = useState<any[]>([]); // TODO: Load from user profile
  
  const checkout = useCheckout([
    // TODO: Load actual cart from context/state
    {
      itemId: 'sample-item',
      name: 'Sample Product',
      price: 100,
      quantity: 2,
      moq: 1,
    },
  ]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Address Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {!showAddressForm ? (
                <AddressSelection
                  addresses={savedAddresses}
                  selectedAddress={checkout.address}
                  onSelect={checkout.setAddress}
                  onAddNew={() => setShowAddressForm(true)}
                />
              ) : (
                <AddressForm
                  onSubmit={(address) => {
                    checkout.setAddress(address);
                    setShowAddressForm(false);
                  }}
                  onCancel={() => setShowAddressForm(false)}
                />
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <PaymentMethodSelector
                selected={checkout.paymentMethod}
                onChange={checkout.setPaymentMethod}
              />
            </div>

            {/* Terms and Place Order */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checkout.termsAccepted}
                  onChange={(e) => checkout.setTermsAccepted(e.target.checked)}
                  className="mt-1"
                />
                <span className="text-sm text-gray-600">
                  I agree to the terms and conditions
                </span>
              </label>

              {checkout.saveAddress && (
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={checkout.saveAddress}
                    onChange={(e) => checkout.setSaveAddress(e.target.checked)}
                    className="mt-1"
                  />
                  <span className="text-sm text-gray-600">
                    Save this address for future orders
                  </span>
                </label>
              )}

              {checkout.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                  {checkout.error}
                </div>
              )}

              <button
                onClick={checkout.placeOrder}
                disabled={!checkout.canPlaceOrder}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {checkout.isPlacingOrder ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <CheckoutSummary
                items={checkout.cart}
                subtotal={checkout.totals.subtotal}
                taxAmount={checkout.totals.taxAmount}
                taxPercentage={checkout.totals.taxPercentage}
                deliveryCharge={checkout.totals.deliveryCharge}
                discount={checkout.totals.discount}
                grandTotal={checkout.totals.grandTotal}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
