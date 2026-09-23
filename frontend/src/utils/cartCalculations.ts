/**
 * Cart Calculations Utilities
 * Pure functions for cart invoice calculations including MOQ validation and extra charge logic
 */

import type { CartItem } from '../types/cart.types';

// Constants
const EXTRA_CHARGE_AMOUNT = 50; // ₹50
const EXTRA_CHARGE_THRESHOLD = 1000; // ₹1000

/**
 * MOQ Violation Details
 */
export interface MOQViolation {
  productId: string;
  productName: string;
  currentQuantity: number;
  minOrderQuantity: number;
  shortage: number;
}

/**
 * Invoice Calculation Result
 */
export interface InvoiceCalculation {
  subtotal: number;
  extraCharge: number;
  total: number;
  itemCount: number;
  totalQuantity: number;
  hasExtraCharge: boolean;
  moqViolations: MOQViolation[];
  hasMOQViolations: boolean;
  isBelowThreshold: boolean;
  shouldApplyCharge: boolean;
  warningMessage: string | null;
  hintMessage: string | null;
}

/**
 * Calculate subtotal from cart items
 */
export function calculateSubtotal(cartItems: CartItem[]): number {
  return cartItems.reduce((sum, item) => {
    return sum + (item.product.price * item.quantity);
  }, 0);
}

/**
 * Check for MOQ violations
 * Returns array of products that are below their minimum order quantity
 */
export function checkMOQViolations(cartItems: CartItem[]): MOQViolation[] {
  const violations: MOQViolation[] = [];
  
  for (const item of cartItems) {
    if (item.quantity < item.product.minOrderQuantity) {
      violations.push({
        productId: item.product.id,
        productName: item.product.name,
        currentQuantity: item.quantity,
        minOrderQuantity: item.product.minOrderQuantity,
        shortage: item.product.minOrderQuantity - item.quantity,
      });
    }
  }
  
  return violations;
}

/**
 * Determine if extra charge should be applied
 * Charge applies when BOTH conditions are true:
 * 1. Subtotal < ₹1000
 * 2. Any product has quantity below its MOQ
 */
export function shouldApplyExtraCharge(
  subtotal: number,
  moqViolations: MOQViolation[]
): boolean {
  const isBelowThreshold = subtotal < EXTRA_CHARGE_THRESHOLD;
  const hasMOQViolations = moqViolations.length > 0;
  
  return isBelowThreshold && hasMOQViolations;
}

/**
 * Calculate extra charge amount
 */
export function calculateExtraCharge(
  subtotal: number,
  moqViolations: MOQViolation[]
): number {
  return shouldApplyExtraCharge(subtotal, moqViolations) ? EXTRA_CHARGE_AMOUNT : 0;
}

/**
 * Calculate final total
 */
export function calculateTotal(cartItems: CartItem[]): number {
  const subtotal = calculateSubtotal(cartItems);
  const moqViolations = checkMOQViolations(cartItems);
  const extraCharge = calculateExtraCharge(subtotal, moqViolations);
  
  return subtotal + extraCharge;
}

/**
 * Generate warning message for MOQ violations
 */
export function generateMOQWarningMessage(violations: MOQViolation[]): string | null {
  if (violations.length === 0) return null;
  
  if (violations.length === 1) {
    const v = violations[0];
    return `${v.productName} is below minimum order quantity (${v.currentQuantity}/${v.minOrderQuantity} ${getUnitText(v.shortage)})`;
  }
  
  return `${violations.length} products are below their minimum order quantities`;
}

/**
 * Generate hint message to avoid extra charge
 */
export function generateChargeHintMessage(
  subtotal: number,
  moqViolations: MOQViolation[]
): string | null {
  const isBelowThreshold = subtotal < EXTRA_CHARGE_THRESHOLD;
  const hasMOQViolations = moqViolations.length > 0;
  
  // No hint needed if charge won't apply
  if (!isBelowThreshold || !hasMOQViolations) {
    return null;
  }
  
  // Calculate how much more is needed
  const amountNeeded = EXTRA_CHARGE_THRESHOLD - subtotal;
  
  // Build hint message
  const hints: string[] = [];
  
  if (amountNeeded > 0) {
    hints.push(`Add ₹${amountNeeded.toFixed(2)} more`);
  }
  
  if (hasMOQViolations) {
    const totalShortage = moqViolations.reduce((sum, v) => sum + v.shortage, 0);
    hints.push(`increase quantities by ${totalShortage} ${getUnitText(totalShortage)}`);
  }
  
  if (hints.length === 0) return null;
  
  return `${hints.join(' or ')} to avoid ₹${EXTRA_CHARGE_AMOUNT} extra charge`;
}

/**
 * Get proper unit text (unit/units)
 */
function getUnitText(count: number): string {
  return count === 1 ? 'unit' : 'units';
}

/**
 * Complete invoice calculation
 * Returns all calculated values and metadata
 */
export function calculateInvoice(cartItems: CartItem[]): InvoiceCalculation {
  // Handle empty cart
  if (cartItems.length === 0) {
    return {
      subtotal: 0,
      extraCharge: 0,
      total: 0,
      itemCount: 0,
      totalQuantity: 0,
      hasExtraCharge: false,
      moqViolations: [],
      hasMOQViolations: false,
      isBelowThreshold: false,
      shouldApplyCharge: false,
      warningMessage: null,
      hintMessage: null,
    };
  }
  
  // Calculate values
  const subtotal = calculateSubtotal(cartItems);
  const moqViolations = checkMOQViolations(cartItems);
  const extraCharge = calculateExtraCharge(subtotal, moqViolations);
  const total = subtotal + extraCharge;
  
  const itemCount = cartItems.length;
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const isBelowThreshold = subtotal < EXTRA_CHARGE_THRESHOLD;
  const hasMOQViolations = moqViolations.length > 0;
  const shouldApplyCharge = shouldApplyExtraCharge(subtotal, moqViolations);
  const hasExtraCharge = extraCharge > 0;
  
  // Generate messages
  const warningMessage = generateMOQWarningMessage(moqViolations);
  const hintMessage = generateChargeHintMessage(subtotal, moqViolations);
  
  return {
    subtotal,
    extraCharge,
    total,
    itemCount,
    totalQuantity,
    hasExtraCharge,
    moqViolations,
    hasMOQViolations,
    isBelowThreshold,
    shouldApplyCharge,
    warningMessage,
    hintMessage,
  };
}

/**
 * Format currency for display (Indian Rupees)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format currency without symbol
 */
export function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

/**
 * Get charge explanation text
 */
export function getChargeExplanation(): string {
  return `Extra charge of ₹${EXTRA_CHARGE_AMOUNT} applies when order total is below ₹${EXTRA_CHARGE_THRESHOLD} AND any product is below its minimum order quantity`;
}

/**
 * Check if cart has any stock issues
 */
export function hasStockIssues(cartItems: CartItem[]): boolean {
  return cartItems.some(item => item.product.hasStockIssue);
}

/**
 * Get list of products with stock issues
 */
export function getStockIssueProducts(cartItems: CartItem[]): CartItem[] {
  return cartItems.filter(item => item.product.hasStockIssue);
}

/**
 * Check if checkout should be blocked
 * (You might want to block checkout if there are critical stock issues)
 */
export function shouldBlockCheckout(cartItems: CartItem[]): boolean {
  // Block if any product is completely out of stock
  return cartItems.some(item => item.product.stockStatus === 'out');
}

/**
 * Get checkout block reason
 */
export function getCheckoutBlockReason(cartItems: CartItem[]): string | null {
  const outOfStockItems = cartItems.filter(item => item.product.stockStatus === 'out');
  
  if (outOfStockItems.length === 0) return null;
  
  if (outOfStockItems.length === 1) {
    return `${outOfStockItems[0].product.name} is out of stock`;
  }
  
  return `${outOfStockItems.length} products are out of stock`;
}

/**
 * Calculate savings if MOQ violations are fixed
 */
export function calculatePotentialSavings(
  subtotal: number,
  moqViolations: MOQViolation[]
): number {
  if (!shouldApplyExtraCharge(subtotal, moqViolations)) {
    return 0;
  }
  
  return EXTRA_CHARGE_AMOUNT;
}

export default {
  calculateSubtotal,
  checkMOQViolations,
  shouldApplyExtraCharge,
  calculateExtraCharge,
  calculateTotal,
  calculateInvoice,
  formatCurrency,
  formatAmount,
  generateMOQWarningMessage,
  generateChargeHintMessage,
  getChargeExplanation,
  hasStockIssues,
  getStockIssueProducts,
  shouldBlockCheckout,
  getCheckoutBlockReason,
  calculatePotentialSavings,
};
