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
import { Alert, Button, Skeleton, Card } from '../../components/ui';
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
  const { subtotal, itemCount, hasStockIssues } = useMemo(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const hasStockIssues = cartItems.some(item => item.product.hasStockIssue);
    
    return { subtotal, itemCount, hasStockIssues };
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
        <div className="max-w-4xl mx-auto py-2 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Empty cart
  if (cartItems.length === 0) {
    return (
      <DashboardLayout title="Store" subtitle="Checkout">
        <div className="max-w-4xl mx-auto py-8">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold">Your cart is empty</p>
              <p className="text-sm mt-1">Add items to your cart before checking out.</p>
            </div>
          </Alert>
          <Button
            onClick={() => navigate('/buyer/products')}
            className="mt-4"
          >
            Browse Products
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // No addresses - show add form inline
  if (addresses.length === 0) {
    return (
      <DashboardLayout title="Store" subtitle="Checkout">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold">No delivery address found</p>
              <p className="text-sm mt-1">Please add a delivery address to continue with checkout.</p>
            </div>
          </Alert>

          {/* Inline Add Address Form */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Add Delivery Address</h2>
            <AddressForm
              mode="create"
              onSubmit={handleAddAddress}
              submitLabel="Add Address & Continue"
              isLoading={isCreatingAddress}
            />
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => navigate('/buyer/addresses')}
              className="flex-1"
            >
              Go to Address Page
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/buyer/cart')}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cart
            </Button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Store" subtitle="Checkout">
      <motion.div 
        className="max-w-5xl mx-auto py-2 space-y-6"
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Checkout</h1>
            <p className="text-sm text-slate-500 mt-0.5">Complete your order</p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate('/buyer/cart')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Cart
          </Button>
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold">Cannot proceed with checkout</p>
              <ul className="text-sm mt-1 space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>• {error}</li>
                ))}
              </ul>
            </div>
          </Alert>
        )}

        {/* Stock Issues Warning */}
        {hasStockIssues && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <div>
              <p className="font-semibold">Stock availability issues</p>
              <p className="text-sm mt-1">Some items in your cart have stock issues. Please review your cart.</p>
            </div>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Cart & Address */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cart Items */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Order Items ({itemCount})</h2>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {cartItems.map((item) => (
                  <div key={item.cartItemId} className="flex gap-4 pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    {item.product.primaryImageUrl && (
                      <img
                        src={item.product.primaryImageUrl}
                        alt={item.product.name}
                        className="w-16 h-16 object-cover rounded-lg border border-slate-200"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-800 truncate">{item.product.name}</h3>
                      <p className="text-sm text-slate-500">SKU: {item.product.sku}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm text-slate-600">Qty: {item.quantity}</span>
                        <span className="text-sm text-slate-400">×</span>
                        <span className="text-sm font-semibold text-slate-800">₹{item.product.price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-800">
                        ₹{(item.product.price * item.quantity).toFixed(2)}
                      </p>
                      {item.product.hasStockIssue && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 mt-1">
                          <AlertCircle className="w-3 h-3" />
                          Stock issue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Address */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-800">Delivery Address</h2>
                  </div>
                  {!showAddAddressForm && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleAddAddressForm}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add New
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Add Address Form (inline) */}
                {showAddAddressForm && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-blue-900">Add New Address</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleToggleAddAddressForm}
                        disabled={isCreatingAddress}
                      >
                        Cancel
                      </Button>
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
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      selectedAddressId === address.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAddressId === address.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-slate-300'
                      }`}>
                        {selectedAddressId === address.id && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-800">{address.name}</p>
                          {address.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{address.phone}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {address.addressLine1}
                          {address.addressLine2 && `, ${address.addressLine2}`}
                        </p>
                        <p className="text-sm text-slate-600">
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Notes */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="p-6">
                <label className="block text-sm font-semibold text-slate-800 mb-2">
                  Order Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any special instructions for delivery..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-slate-500 mt-2">{notes.length}/500 characters</p>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm sticky top-4">
              <div className="p-6 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-slate-600" />
                  <h2 className="text-lg font-semibold text-slate-800">Order Summary</h2>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal ({itemCount} items)</span>
                    <span className="font-semibold text-slate-800">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Delivery Charges</span>
                    <span className="font-semibold text-green-600">FREE</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-800">Total Amount</span>
                      <span className="text-xl font-bold text-slate-900">₹{subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="bg-blue-50 rounded-xl p-4 mb-4">
                    <p className="text-sm font-semibold text-blue-900">Payment Method</p>
                    <p className="text-sm text-blue-700 mt-1">Cash on Delivery (COD)</p>
                  </div>

                  {selectedAddress && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-4">
                      <p className="text-sm font-semibold text-slate-800 mb-1">Delivering to:</p>
                      <p className="text-sm text-slate-600">{selectedAddress.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{selectedAddress.city}, {selectedAddress.state}</p>
                    </div>
                  )}

                  <Button
                    onClick={handlePlaceOrder}
                    disabled={checkoutLoading || validating || hasStockIssues || !selectedAddressId}
                    className="w-full"
                  >
                    {checkoutLoading ? (
                      <>
                        Placing Order...
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </>
                    ) : (
                      <>
                        Place Order
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-center text-slate-500 mt-3">
                    By placing this order, you agree to our terms and conditions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}
