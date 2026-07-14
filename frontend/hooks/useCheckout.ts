/**
 * useCheckout Hook
 * Task #20: State management hooks
 * 
 * Manages checkout state and order placement logic
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ordersApi } from '@/lib/api';
import type { DeliveryAddress, PaymentMethod } from '@/lib/types';

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  moq: number;
  imageUrl?: string;
}

interface CheckoutTotals {
  subtotal: number;
  taxAmount: number;
  taxPercentage: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
}

export function useCheckout(initialCart: CartItem[] = []) {
  const router = useRouter();
  
  // State
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PHONEPE');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals
  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxPercentage = 5; // 5% GST - can be configurable
    const taxAmount = (subtotal * taxPercentage) / 100;
    const deliveryCharge = subtotal >= 5000 ? 0 : 100; // Free delivery above ₹5000
    const discount = 0; // Can add discount logic later
    const grandTotal = subtotal + taxAmount + deliveryCharge - discount;

    return {
      subtotal,
      taxAmount,
      taxPercentage,
      deliveryCharge,
      discount,
      grandTotal,
    };
  }, [cart]);

  // Validation
  const canPlaceOrder = useMemo(() => {
    return (
      cart.length > 0 &&
      address !== null &&
      termsAccepted &&
      !isPlacingOrder
    );
  }, [cart.length, address, termsAccepted, isPlacingOrder]);

  // Update cart quantity
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? { ...item, quantity: Math.max(item.moq, quantity) }
          : item
      )
    );
  }, []);

  // Remove item from cart
  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((item) => item.itemId !== itemId));
  }, []);

  // Place order
  const placeOrder = useCallback(async () => {
    if (!canPlaceOrder) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setIsPlacingOrder(true);
      setError(null);

      // Prepare order data
      const orderData = {
        items: cart.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
        })),
        deliveryAddress: address!,
        paymentMethod,
      };

      // Create order via API
      const response = await ordersApi.createOrder(orderData);

      if (response.data.paymentMethod === 'PHONEPE' && response.data.phonepeRedirectUrl) {
        // Redirect to PhonePe payment page
        window.location.href = response.data.phonepeRedirectUrl;
      } else {
        // COD order - redirect to success page
        router.push(`/retailer/orders/${response.data.order.id}?success=true`);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to place order. Please try again.'
      );
    } finally {
      setIsPlacingOrder(false);
    }
  }, [canPlaceOrder, cart, address, paymentMethod, router]);

  return {
    // State
    cart,
    address,
    paymentMethod,
    termsAccepted,
    saveAddress,
    isPlacingOrder,
    error,

    // Computed
    totals,
    canPlaceOrder,

    // Actions
    setCart,
    setAddress,
    setPaymentMethod,
    setTermsAccepted,
    setSaveAddress,
    updateQuantity,
    removeItem,
    placeOrder,
  };
}
