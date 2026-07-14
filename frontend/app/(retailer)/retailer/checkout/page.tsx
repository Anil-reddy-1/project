/**
 * Checkout Page
 * Task #16: Checkout page and components
 * 
 * Complete checkout flow with address, payment method, and order placement
 */

'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { useCheckout, useAddresses } from '@/hooks';
import { CheckoutSummary } from '@/components/retailer/checkout/CheckoutSummary';
import { AddressSelection } from '@/components/retailer/checkout/AddressSelection';
import { AddressForm } from '@/components/retailer/checkout/AddressForm';
import { PaymentMethodSelector } from '@/components/retailer/checkout/PaymentMethodSelector';
import {
  CheckoutSkeleton,
  EmptyCart,
  InlineError,
  InlineInfo,
} from '@/components/ui';

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [isLoadingCart, setIsLoadingCart] = useState(true);

  // Load cart from localStorage or session
  useEffect(() => {
    try {
      // Try to get cart from localStorage
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        const items = Object.values(parsed).map((cartItem: any) => ({
          itemId: cartItem.item.itemId,
          name: cartItem.item.name,
          price: cartItem.item.price,
          quantity: cartItem.qty,
          moq: 1, // Default MOQ
          imageUrl: cartItem.item.images?.[0]?.url,
        }));
        setCartItems(items);
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
    } finally {
      setIsLoadingCart(false);
    }
  }, []);

  const checkout = useCheckout(cartItems);
  const {
    addresses,
    isLoading: isLoadingAddresses,
    createAddress,
  } = useAddresses(user?.uid || null);

  const handleAddressSubmit = async (addressData: any) => {
    try {
      if (user?.uid) {
        const newAddress = await createAddress(addressData);
        checkout.setAddress(newAddress);
      } else {
        // For users without account, just use the address directly
        checkout.setAddress(addressData);
      }
      setShowAddressForm(false);
    } catch (error) {
      console.error('Failed to save address:', error);
    }
  };

  if (isLoadingCart || isLoadingAddresses) {
    return <CheckoutSkeleton />;
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <EmptyCart />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
        <p className="text-gray-600 mb-8">Complete your order</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* MOQ Notice */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <InlineInfo message="Please ensure your order meets the minimum order quantity (MOQ) requirements." />
            </div>

            {/* Address Section */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              {!showAddressForm ? (
                <AddressSelection
                  addresses={addresses}
                  selectedAddress={checkout.address}
                  onSelect={checkout.setAddress}
                  onAddNew={() => setShowAddressForm(true)}
                />
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Add Delivery Address
                  </h3>
                  <AddressForm
                    onSubmit={handleAddressSubmit}
                    onCancel={() => setShowAddressForm(false)}
                  />
                </>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <PaymentMethodSelector
                selected={checkout.paymentMethod === 'PHONEPE' ? 'prepaid' : 'cod'}
                onChange={(method) =>
                  checkout.setPaymentMethod(method === 'prepaid' ? 'PHONEPE' : 'COD')
                }
              />
            </div>

            {/* Terms and Place Order */}
            <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkout.termsAccepted}
                  onChange={(e) => checkout.setTermsAccepted(e.target.checked)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  I agree to the{' '}
                  <a href="/terms" className="text-blue-600 hover:text-blue-700">
                    terms and conditions
                  </a>
                  {' '}and{' '}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-700">
                    privacy policy
                  </a>
                </span>
              </label>

              {checkout.error && (
                <InlineError message={checkout.error} />
              )}

              <button
                onClick={checkout.placeOrder}
                disabled={!checkout.canPlaceOrder}
                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {checkout.isPlacingOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    Place Order
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </>
                )}
              </button>

              {!checkout.canPlaceOrder && !checkout.isPlacingOrder && (
                <p className="text-xs text-gray-500 text-center">
                  {!checkout.address
                    ? 'Please select a delivery address'
                    : !checkout.termsAccepted
                    ? 'Please accept terms and conditions'
                    : 'Please complete all required fields'}
                </p>
              )}
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
                editable={false}
              />

              {/* Security Notice */}
              <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg
                    className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                  <div>
                    <p className="text-xs font-medium text-gray-900 mb-1">
                      Secure Checkout
                    </p>
                    <p className="text-xs text-gray-600">
                      Your payment information is encrypted and secure
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
