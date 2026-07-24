/**
 * useCheckout Hook
 * Task #20: State management hooks
 *
 * Manages checkout state and order placement logic
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '@/lib/api';
import type { DeliveryAddress, PaymentMethod } from '@/lib/types';

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  moq?: number;
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

export function useCheckout(cartItems: CartItem[] = []) {
  const router = useRouter();

  // Don't create local cart state - use the passed cartItems directly
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('prepaid');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxPercentage = 5; // 5% GST
    const taxAmount = (subtotal * taxPercentage) / 100;
    const deliveryCharge = subtotal >= 5000 ? 0 : 100; // Free above ₹5000
    const discount = 0;
    const grandTotal = subtotal + taxAmount + deliveryCharge - discount;
    return { subtotal, taxAmount, taxPercentage, deliveryCharge, discount, grandTotal };
  }, [cartItems]);

  const canPlaceOrder = useMemo(
    () => cartItems.length > 0 && address !== null && termsAccepted && !isPlacingOrder,
    [cartItems.length, address, termsAccepted, isPlacingOrder]
  );

  const placeOrder = useCallback(async () => {
    if (!canPlaceOrder) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setIsPlacingOrder(true);
      setError(null);
      
      const response = await createOrder({
        items: cartItems.map(({ itemId, quantity }) => ({ itemId, quantity })),
        deliveryAddress: address as any,
        paymentMethod,
      });

      // API returns { success, data: { orderId, phonepeRedirectUrl?, ... } }
      const data = (response as any).data ?? response;

      if (paymentMethod === 'prepaid' && data.phonepeRedirectUrl) {
        window.location.href = data.phonepeRedirectUrl;
      } else {
        router.push(`/retailer/orders/${data.orderId}?success=true`);
      }
    } catch (err: any) {
      console.error('Order placement error:', err);
      
      // Extract the actual error message from the backend response
      let errorMessage = 'Failed to place order. Please try again.';
      
      if (err.data) {
        // Backend sends { success: false, message: '...' }
        errorMessage = err.data.message || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      console.error('Detailed error:', {
        message: errorMessage,
        data: err.data,
        status: err.status,
      });
      
      setError(errorMessage);
    } finally {
      setIsPlacingOrder(false);
    }
  }, [canPlaceOrder, cartItems, address, paymentMethod, router]);

  return {
    cart: cartItems, // Return the passed cartItems directly
    address,
    paymentMethod,
    termsAccepted,
    saveAddress,
    isPlacingOrder,
    error,
    totals,
    canPlaceOrder,
    setAddress,
    setPaymentMethod,
    setTermsAccepted,
    setSaveAddress,
    placeOrder,
  };
}
