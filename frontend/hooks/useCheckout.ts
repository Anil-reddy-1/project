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

  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PHONEPE');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [saveAddress, setSaveAddress] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo<CheckoutTotals>(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const taxPercentage = 5; // 5% GST
    const taxAmount = (subtotal * taxPercentage) / 100;
    const deliveryCharge = subtotal >= 5000 ? 0 : 100; // Free above ₹5000
    const discount = 0;
    const grandTotal = subtotal + taxAmount + deliveryCharge - discount;
    return { subtotal, taxAmount, taxPercentage, deliveryCharge, discount, grandTotal };
  }, [cart]);

  const canPlaceOrder = useMemo(
    () => cart.length > 0 && address !== null && termsAccepted && !isPlacingOrder,
    [cart.length, address, termsAccepted, isPlacingOrder]
  );

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    setCart((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? { ...item, quantity: Math.max(item.moq, quantity) }
          : item
      )
    );
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setCart((prev) => prev.filter((item) => item.itemId !== itemId));
  }, []);

  const placeOrder = useCallback(async () => {
    if (!canPlaceOrder) {
      setError('Please complete all required fields');
      return;
    }

    try {
      setIsPlacingOrder(true);
      setError(null);

      const response = await createOrder({
        items: cart.map(({ itemId, quantity }) => ({ itemId, quantity })),
        deliveryAddress: address as any,
        paymentMethod,
      });

      // API returns { success, data: { orderId, phonepeRedirectUrl?, ... } }
      const data = (response as any).data ?? response;

      if (paymentMethod === 'PHONEPE' && data.phonepeRedirectUrl) {
        window.location.href = data.phonepeRedirectUrl;
      } else {
        router.push(`/retailer/orders/${data.orderId}?success=true`);
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
    cart,
    address,
    paymentMethod,
    termsAccepted,
    saveAddress,
    isPlacingOrder,
    error,
    totals,
    canPlaceOrder,
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
