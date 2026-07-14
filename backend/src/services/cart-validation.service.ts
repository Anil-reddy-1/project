/**
 * Cart Validation Service
 * Derived from: Phase 3 Implementation Plan §8.3.4
 * 
 * Validates cart items before order creation:
 * - Product exists and is active
 * - MOQ requirements met
 * - Inventory available (validation only, no decrement)
 * - Pricing matches current product price
 * 
 * Never trust frontend data - always validate server-side.
 */

import { adminDb } from '../config/firebase';

export interface CartItem {
  itemId: string;
  quantity: number;
  expectedPrice?: number; // Optional: for price validation
}

export interface ValidationError {
  itemId: string;
  productName?: string;
  error: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class CartValidationService {
  /**
   * Validate all cart items
   * Returns comprehensive validation result with all errors
   */
  async validateCart(items: CartItem[]): Promise<ValidationResult> {
    if (!items || items.length === 0) {
      return {
        isValid: false,
        errors: [{
          itemId: '',
          error: 'Cart is empty',
          code: 'CART_EMPTY',
        }],
      };
    }

    const errors: ValidationError[] = [];

    // Validate each item
    for (const item of items) {
      const itemErrors = await this.validateItem(item.itemId, item.quantity, item.expectedPrice);
      if (itemErrors) {
        errors.push(itemErrors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a single cart item
   * Returns ValidationError if invalid, null if valid
   */
  private async validateItem(
    itemId: string,
    quantity: number,
    expectedPrice?: number
  ): Promise<ValidationError | null> {
    try {
      // Fetch item from database
      const db = adminDb();
      const itemRef = db.collection('items').doc(itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        return {
          itemId,
          error: 'Product not found or unavailable',
          code: 'ITEM_NOT_FOUND',
        };
      }

      const item = itemDoc.data()!;
      const productName = item.name || 'Unknown Product';

      // Check if product is active
      if (!item.isAvailable || item.isAvailable === false) {
        return {
          itemId,
          productName,
          error: `${productName} is no longer available`,
          code: 'ITEM_INACTIVE',
        };
      }

      // Validate quantity is positive
      if (quantity <= 0) {
        return {
          itemId,
          productName,
          error: 'Quantity must be greater than zero',
          code: 'INVALID_QUANTITY',
        };
      }

      // Check MOQ (Minimum Order Quantity)
      const moq = item.moq || 1;
      if (quantity < moq) {
        return {
          itemId,
          productName,
          error: `Minimum order quantity for ${productName} is ${moq}`,
          code: 'MOQ_NOT_MET',
        };
      }

      // Check inventory availability (validation only, no decrement in Phase 3)
      const availableStock = item.stock || 0;
      if (quantity > availableStock) {
        return {
          itemId,
          productName,
          error: `Insufficient stock for ${productName}. Available: ${availableStock}`,
          code: 'INSUFFICIENT_STOCK',
        };
      }

      // Verify pricing if expected price provided
      if (expectedPrice !== undefined) {
        const currentPrice = item.price || 0;
        // Allow small floating point differences (0.01 tolerance)
        if (Math.abs(currentPrice - expectedPrice) > 0.01) {
          return {
            itemId,
            productName,
            error: `Price for ${productName} has changed from ₹${expectedPrice} to ₹${currentPrice}`,
            code: 'PRICE_CHANGED',
          };
        }
      }

      // All validations passed
      return null;
    } catch (error) {
      console.error(`[CartValidation] Error validating item ${itemId}:`, error);
      return {
        itemId,
        error: 'Failed to validate item',
        code: 'VALIDATION_ERROR',
      };
    }
  }

  /**
   * Check if product exists and is active
   */
  async checkProductAvailability(itemId: string): Promise<boolean> {
    try {
      const db = adminDb();
      const itemRef = db.collection('items').doc(itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        return false;
      }

      const item = itemDoc.data()!;
      return item.isAvailable !== false;
    } catch (error) {
      console.error(`[CartValidation] Error checking availability for ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Verify MOQ is satisfied
   */
  checkMOQ(quantity: number, moq: number): boolean {
    return quantity >= moq;
  }

  /**
   * Check if sufficient inventory available
   * Validation only - does not decrement inventory
   */
  async checkInventory(itemId: string, quantity: number): Promise<boolean> {
    try {
      const db = adminDb();
      const itemRef = db.collection('items').doc(itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        return false;
      }

      const item = itemDoc.data()!;
      const availableStock = item.stock || 0;

      return quantity <= availableStock;
    } catch (error) {
      console.error(`[CartValidation] Error checking inventory for ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Verify pricing matches current product price
   */
  async verifyPricing(itemId: string, expectedPrice: number): Promise<boolean> {
    try {
      const db = adminDb();
      const itemRef = db.collection('items').doc(itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        return false;
      }

      const item = itemDoc.data()!;
      const currentPrice = item.price || 0;

      // Allow small floating point differences
      return Math.abs(currentPrice - expectedPrice) <= 0.01;
    } catch (error) {
      console.error(`[CartValidation] Error verifying price for ${itemId}:`, error);
      return false;
    }
  }

  /**
   * Get current item details for price/stock verification
   */
  async getItemDetails(itemId: string): Promise<{
    price: number;
    stock: number;
    moq: number;
    isAvailable: boolean;
  } | null> {
    try {
      const db = adminDb();
      const itemRef = db.collection('items').doc(itemId);
      const itemDoc = await itemRef.get();

      if (!itemDoc.exists) {
        return null;
      }

      const item = itemDoc.data()!;

      return {
        price: item.price || 0,
        stock: item.stock || 0,
        moq: item.moq || 1,
        isAvailable: item.isAvailable !== false,
      };
    } catch (error) {
      console.error(`[CartValidation] Error getting item details for ${itemId}:`, error);
      return null;
    }
  }
}

// Export singleton instance
export const cartValidationService = new CartValidationService();
