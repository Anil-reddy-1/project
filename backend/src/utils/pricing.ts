/**
 * Pricing Calculator Utilities
 * Derived from: Phase 3 Implementation Plan §8.4.2
 * 
 * Server-side price calculations to prevent client-side manipulation.
 * All monetary values in INR (smallest unit: paise for PhonePe, rupees for display).
 */

import { env } from '../config/env';

export interface OrderItem {
  unitPrice: number;
  quantity: number;
}

export interface PricingBreakdown {
  subtotal: number;
  taxAmount: number;
  taxPercentage: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
}

/**
 * Calculate subtotal from order items
 * 
 * @param items - Array of order items with unitPrice and quantity
 * @returns Subtotal amount
 */
export function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => {
    return sum + (item.unitPrice * item.quantity);
  }, 0);
}

/**
 * Calculate tax amount
 * 
 * @param subtotal - Subtotal amount
 * @param taxPercentage - Tax percentage (default from env)
 * @returns Tax amount
 */
export function calculateTax(
  subtotal: number,
  taxPercentage: number = env.DEFAULT_TAX_PERCENTAGE
): number {
  return Math.round((subtotal * taxPercentage) / 100);
}

/**
 * Calculate delivery charge
 * Currently uses flat rate from environment.
 * Future: Can be based on distance, weight, or order value.
 * 
 * @param subtotal - Subtotal amount (for potential free delivery threshold)
 * @returns Delivery charge
 */
export function calculateDeliveryCharge(subtotal: number): number {
  // Future enhancement: Free delivery above certain amount
  // if (subtotal >= FREE_DELIVERY_THRESHOLD) return 0;
  return env.DEFAULT_DELIVERY_CHARGE;
}

/**
 * Calculate grand total
 * 
 * @param subtotal - Subtotal amount
 * @param taxAmount - Tax amount
 * @param deliveryCharge - Delivery charge
 * @param discount - Discount amount (default 0)
 * @returns Grand total
 */
export function calculateGrandTotal(
  subtotal: number,
  taxAmount: number,
  deliveryCharge: number,
  discount: number = 0
): number {
  return Math.max(0, subtotal + taxAmount + deliveryCharge - discount);
}

/**
 * Calculate complete pricing breakdown
 * 
 * @param items - Array of order items
 * @param discount - Optional discount amount
 * @returns Complete pricing breakdown
 */
export function calculatePricingBreakdown(
  items: OrderItem[],
  discount: number = 0
): PricingBreakdown {
  const subtotal = calculateSubtotal(items);
  const taxPercentage = env.DEFAULT_TAX_PERCENTAGE;
  const taxAmount = calculateTax(subtotal, taxPercentage);
  const deliveryCharge = calculateDeliveryCharge(subtotal);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount, deliveryCharge, discount);
  
  return {
    subtotal,
    taxAmount,
    taxPercentage,
    deliveryCharge,
    discount,
    grandTotal,
  };
}

/**
 * Convert rupees to paise (for PhonePe API)
 * PhonePe requires amount in smallest currency unit (paise).
 * 
 * @param rupees - Amount in rupees
 * @returns Amount in paise
 */
export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

/**
 * Convert paise to rupees (for display)
 * 
 * @param paise - Amount in paise
 * @returns Amount in rupees
 */
export function paiseToRupees(paise: number): number {
  return paise / 100;
}

/**
 * Format amount as currency string
 * 
 * @param amount - Amount in rupees
 * @returns Formatted currency string (e.g., "₹1,234.56")
 */
export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
