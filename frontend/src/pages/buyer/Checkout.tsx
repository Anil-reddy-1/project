/**
 * Checkout Page
 * Complete checkout flow with cart review, address selection, and order placement
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  CreditCard, MapPin, Package, AlertCircle, 
  CheckCircle, ArrowRight, ArrowLeft, Loader2, Plus 
} from 'lucide-react';
import { DashboardLayout } from '../../components/layout';
import { useCart } from '../../hooks/useCart';
import { useCheckout } from '../../hooks/useCheckout';
import { addressService } from '../../services/address.service';
import { AddressForm } from '../../components/address';
import { Alert, Skeleton } from '../../components/ui';
import { showErrorToast, showToast } from '../../utils/toast';
import { fadeVariants } from '../../utils/animations';
import type { Address, AddressFormData } from '../../types/address.types';

export function Checkout() {
  const navigate = useNavigate();
  const { cartItems, loading: cartLoading } = useCart();
  const { placeOrder, validateOrder, loading: checkoutLoading, validating, validationErrors } = useCheckout();
  
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [notes, setNotes] = useState('');
  const [validated, setValidated] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [isCreatingAddress, setIsCreatingAddress] = useState(false);

  // Calculate totals
  const { subtotal, itemCount, hasStockIssues, totalSavings } = useMemo(() => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + ((item.product.sellingPrice ?? item.product.price ?? 0) * item.quantity),
      0
    );
    const totalSavings = cartItems.reduce((sum, item) => {
      const selling = item.product.sellingPrice ?? item.product.price ?? 0;
      const display = item.product.displayPrice ?? 0;
      if (display > selling) {
        return sum + ((display - selling) * item.quantity);
      }
      return sum;
    }, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const hasStockIssues = cartItems.some(item => item.product.hasStockIssue);
    
    return { subtotal, itemCount, hasStockIssues, totalSavings };
  }, [cartItems]);

  // Load addresses
  useEffect(() => {
    const loadAddresses = async () => {
      try {
        setLoadingAddresses(true);
        const addressList = await addressService.getAddressList();
        setAddresses(addressList);
        
        // Auto-select default address
        const defaultAddr = addressList.find(addr => addr.isDefault);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        }
      } catch (error) {
        console.error('Error loading addresses:', error);
        showErrorToast('Failed to load addresses');
      } finally {
        setLoadingAddresses(false);
      }
    };
    
    loadAddresses();
  }, []);

  // Validate when address is selected
  useEffect(() => {
    if (selectedAddressId && !validated) {
      handleValidate();
    }
  }, [selectedAddressId]);

  const handleValidate = async () => {
    if (!selectedAddressId) {
      showErrorToast('Please select a delivery address');
      return;
    }
    
    const isValid = await validateOrder(selectedAddressId);
    setValidated(isValid);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      showErrorToast('Please select a delivery address');
      return;
    }

    if (hasStockIssues) {
      showErrorToast('Some items in your cart have stock issues');
      return;
    }

    // Validate before placing order
    if (!validated) {
      const isValid = await validateOrder(selectedAddressId);
      if (!isValid) return;
    }

    const orderId = await placeOrder({
      addressId: selectedAddressId,
      paymentMethod: 'COD',
      notes: notes.trim() || undefined,
    });

    if (orderId) {
      // Redirect to order confirmation
      navigate(`/buyer/orders/${orderId}`);
    }
  };

  /**
   * Handle add address inline
   */
  const handleAddAddress = async (data: AddressFormData) => {
    try {
      setIsCreatingAddress(true);
      const response = await addressService.createAddress(data);
      const newAddress = response.data;
      setAddresses((prev) => [newAddress, ...prev]);
      setSelectedAddressId(newAddress.id);
      setShowAddAddressForm(false);
      setValidated(false); // Reset validation when address changes
      showToast.success('Address added successfully');
    } catch (error: any) {
      console.error('Error creating address:', error);
      showToast.error(error.message || 'Failed to add address');
      throw error; // Re-throw to prevent form from closing on error
    } finally {
      setIsCreatingAddress(false);
    }
  };

  /**
   * Handle show/hide add address form
   */
  const handleToggleAddAddressForm = () => {
    setShowAddAddressForm((prev) => !prev);
  };

  const selectedAddress = addresses.find(addr => addr.id === selectedAddressId);

  // Loading state
  if (cartLoading || loadingAddresses) {
    return (
      <DashboardLayout title="Store" subtitle="Checkout">
        <div className="w-full space-y-8">
          <div className="space-y-3 pb-6 border-b border-ivory-200">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <DashboardLayout title="Store" subtitle="Checkout">
        <div className="max-w-xl mx-auto py-10 sm:py-16 text-center">
          <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-white border border-ivory-300 flex items-center justify-center">
            <Package className="w-7 h-7 text-ink" strokeWidth={1.25} />
          </div>
          <p className="shop-eyebrow">Checkout</p>
          <h1 className="shop-title mt-2">Your cart is empty</h1>
          <p className="shop-subtitle mt-3">Add items to your cart before checking out.</p>
          <button
            onClick={() => navigate('/buyer/products')}
            className="shop-btn-primary mt-8"
          >
            Browse products
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // No addresses - show add form inline
  if (addresses.length === 0) {
    return (
      <DashboardLayout title="Store" subtitle="Checkout">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="pb-6 border-b border-ivory-200">
            <p className="shop-eyebrow">Checkout</p>
            <h1 className="shop-title mt-2">Where should we deliver?</h1>
            <p className="shop-subtitle mt-2">Please add a delivery address to continue with checkout.</p>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">No delivery address found</p>
              <p className="text-xs text-amber-800 mt-0.5">Add one below, or manage your saved addresses.</p>
            </div>
          </div>

          {/* Inline Add Address Form */}
          <div className="shop-card">
            <div className="shop-card-header">
              <h2 className="shop-heading text-lg flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brass-600" />
                Add delivery address
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <AddressForm
                mode="create"
                onSubmit={handleAddAddress}
                submitLabel="Add Address & Continue"
                isLoading={isCreatingAddress}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => navigate('/buyer/addresses')}
              className="shop-btn-outline flex-1"
            >
              Go to address page
            </button>
            <button
              onClick={() => navigate('/buyer/cart')}
              className="shop-btn-outline flex-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to cart
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Store" subtitle="Checkout">
      <motion.div
        className="w-full space-y-8"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-ivory-200">
          <div>
            <p className="shop-eyebrow">Secure checkout</p>
            <h1 className="shop-title mt-2">Checkout</h1>
            <p className="shop-subtitle mt-2">Review your items, choose a delivery address and place your order.</p>
          </div>
          <button
            onClick={() => navigate('/buyer/cart')}
            className="shop-btn-outline self-start sm:self-auto h-10 px-5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to cart
          </button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive" className="rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold">Cannot proceed with checkout</p>
              <ul className="text-sm mt-1 space-y-1 list-disc pl-4">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </Alert>
        )}

        {/* Stock Issues Warning */}
        {hasStockIssues && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Stock availability issues</p>
              <p className="text-xs text-amber-800 mt-0.5">Some items in your cart have stock issues. Please review your cart.</p>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Left Column - Cart & Address */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* Cart Items */}
            <section className="shop-card">
              <div className="shop-card-header">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm text-brass-600 tabular-nums">01</span>
                  <h2 className="shop-heading text-lg">Order items</h2>
                </div>
                <span className="shop-chip">
                  <Package className="w-3 h-3" />
                  {itemCount} {itemCount === 1 ? 'unit' : 'units'}
                </span>
              </div>
              <div className="px-5 sm:px-6 divide-y divide-ivory-200">
                {cartItems.map((item) => (
                  <div key={item.cartItemId} className="flex gap-4 py-4">
                    {item.product.primaryImageUrl && (
                      <img
                        src={item.product.primaryImageUrl}
                        alt={item.product.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 object-cover rounded-xl border border-ivory-200 bg-ivory-100"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[15px] font-medium text-ink truncate">{item.product.name}</h3>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-stone-400 mt-0.5">SKU {item.product.sku}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-stone-500 tabular-nums">
                        <span>Qty {item.quantity}</span>
                        <span className="text-stone-300">×</span>
                        <span className="font-medium text-ink-700">₹{item.product.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="shop-price text-[15px]">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      {item.product.hasStockIssue && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          Stock issue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Delivery Address */}
            <section className="shop-card">
              <div className="shop-card-header">
                <div className="flex items-center gap-3">
                  <span className="font-display text-sm text-brass-600 tabular-nums">02</span>
                  <h2 className="shop-heading text-lg">Delivery address</h2>
                </div>
                {!showAddAddressForm && (
                  <button
                    onClick={handleToggleAddAddressForm}
                    className="shop-btn-outline h-9 px-4 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add new
                  </button>
                )}
              </div>
              <div className="p-5 sm:p-6 space-y-3">
                {/* Add Address Form (inline) */}
                {showAddAddressForm && (
                  <div className="mb-5 p-4 sm:p-5 bg-ivory-50 rounded-2xl border border-ivory-300">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="font-display text-base font-medium text-ink">Add new address</h3>
                      <button
                        onClick={handleToggleAddAddressForm}
                        disabled={isCreatingAddress}
                        className="shop-btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </div>
                    <AddressForm
                      mode="create"
                      onSubmit={handleAddAddress}
                      submitLabel="Add Address"
                      isLoading={isCreatingAddress}
                    />
                  </div>
                )}

                {/* Address List */}
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    onClick={() => setSelectedAddressId(address.id)}
                    className={`p-4 sm:p-5 rounded-2xl border transition-colors cursor-pointer ${
                      selectedAddressId === address.id
                        ? 'border-ink bg-ivory-50 ring-1 ring-ink'
                        : 'border-ivory-200 bg-white hover:border-ivory-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-5 h-5 shrink-0 rounded-full border flex items-center justify-center transition-colors ${
                        selectedAddressId === address.id
                          ? 'border-ink bg-ink'
                          : 'border-ivory-300 bg-white'
                      }`}>
                        {selectedAddressId === address.id && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <p className="font-display text-[15px] font-medium text-ink">{address.name}</p>
                          {address.isDefault && (
                            <span className="shop-chip border-brass-100 text-brass-700">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-500 tabular-nums">{address.phone}</p>
                        <p className="text-sm text-ink-700 mt-1.5 leading-relaxed">
                          {address.addressLine1}
                          {address.addressLine2 && `, ${address.addressLine2}`}
                        </p>
                        <p className="text-sm text-ink-700 leading-relaxed">
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Order Notes */}
            <section className="shop-card">
              <div className="p-5 sm:p-6">
                <label htmlFor="checkout-notes" className="flex items-center gap-3 mb-3">
                  <span className="font-display text-sm text-brass-600 tabular-nums">03</span>
                  <span className="shop-heading text-lg">Order notes</span>
                  <span className="text-xs text-stone-400">(optional)</span>
                </label>
                <textarea
                  id="checkout-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions for delivery..."
                  className="w-full px-4 py-3 text-sm text-ink bg-white border border-ivory-300 rounded-xl placeholder:text-stone-400 focus:outline-none focus:border-ink-300 focus:ring-2 focus:ring-brass-100 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-[11px] text-stone-400 mt-2 text-right tabular-nums">{notes.length}/500 characters</p>
              </div>
            </section>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="shop-card overflow-hidden lg:sticky lg:top-28">
              <div className="px-6 pt-6 pb-5 border-b border-dashed border-ivory-300">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="shop-eyebrow">Receipt</p>
                    <h2 className="shop-heading mt-1.5">Order summary</h2>
                  </div>
                  <div className="w-9 h-9 rounded-full border border-ivory-300 bg-ivory-50 flex items-center justify-center text-brass-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <div className="space-y-3">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-stone-500">Subtotal ({itemCount} items)</span>
                    <span className="font-medium text-ink tabular-nums">₹{subtotal.toFixed(2)}</span>
                  </div>
                  {totalSavings > 0 && (
                    <div className="flex justify-between gap-3 text-sm text-emerald-700">
                      <span>Discount savings</span>
                      <span className="font-medium tabular-nums">-₹{totalSavings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-stone-500">Delivery charges</span>
                    <span className="font-semibold text-emerald-700 text-xs uppercase tracking-[0.14em]">Free</span>
                  </div>
                </div>

                <div className="shop-rule my-5" />

                <div className="flex items-end justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-500 pb-1">Total amount</span>
                  <span className="shop-price text-3xl font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-stone-400 text-right mt-1">Inclusive of all taxes</p>

                {totalSavings > 0 && (
                  <div className="mt-4 px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-between text-xs text-emerald-800 font-semibold">
                    <span>You save on this order</span>
                    <span className="tabular-nums">₹{totalSavings.toFixed(2)}</span>
                  </div>
                )}

                <div className="shop-rule my-5" />

                <dl className="space-y-4 mb-6">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Payment method</dt>
                    <dd className="text-sm text-ink mt-1">Cash on Delivery (COD)</dd>
                  </div>

                  {selectedAddress && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">Delivering to</dt>
                      <dd className="text-sm text-ink mt-1">{selectedAddress.name}</dd>
                      <dd className="text-xs text-stone-500 mt-0.5">{selectedAddress.city}, {selectedAddress.state}</dd>
                    </div>
                  )}
                </dl>

                <button
                  onClick={handlePlaceOrder}
                  disabled={checkoutLoading || validating || hasStockIssues || !selectedAddressId}
                  className="shop-btn-primary w-full h-12"
                >
                  {checkoutLoading ? (
                    <>
                      Placing order...
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </>
                  ) : (
                    <>
                      Place order
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-xs text-center text-stone-500 mt-3 leading-relaxed">
                  By placing this order, you agree to our terms and conditions
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
