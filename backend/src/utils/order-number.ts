/**
 * Order Number Generator
 * Derived from: Phase 3 Implementation Plan §8.4.1
 * 
 * Generates unique, human-readable order numbers in format: ORD-YYYYMMDD-NNNN
 * Uses Firestore atomic increment to ensure uniqueness.
 */

import { adminDb } from '../config/firebase';
import { env } from '../config/env';

/**
 * Generate a unique order number
 * 
 * Format: {PREFIX}-{YYYYMMDD}-{NNNN}
 * Example: ORD-20260713-0001
 * 
 * Uses Firestore counter document with atomic increment to prevent duplicates.
 * Counter resets daily to keep numbers manageable.
 * 
 * @returns Promise<string> Unique order number
 */
export async function generateOrderNumber(): Promise<string> {
  const db = adminDb();
  const prefix = env.ORDER_NUMBER_PREFIX;
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Counter document path: counters/order-{YYYYMMDD}
  const counterDocId = `order-${dateStr}`;
  const counterRef = db.collection('counters').doc(counterDocId);
  
  try {
    // Use Firestore transaction for atomic increment
    const counter = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(counterRef);
      
      let newCount = 1;
      if (doc.exists) {
        const data = doc.data();
        newCount = (data?.count || 0) + 1;
      }
      
      transaction.set(counterRef, {
        count: newCount,
        date: dateStr,
        lastUpdated: new Date(),
      });
      
      return newCount;
    });
    
    // Format counter with leading zeros (4 digits)
    const counterStr = counter.toString().padStart(4, '0');
    
    return `${prefix}-${dateStr}-${counterStr}`;
  } catch (error) {
    console.error('[OrderNumber] Failed to generate order number:', error);
    throw new Error('Failed to generate order number');
  }
}

/**
 * Validate order number format
 * 
 * @param orderNumber - Order number to validate
 * @returns true if format is valid
 */
export function isValidOrderNumber(orderNumber: string): boolean {
  const prefix = env.ORDER_NUMBER_PREFIX;
  // Format: PREFIX-YYYYMMDD-NNNN
  const regex = new RegExp(`^${prefix}-\\d{8}-\\d{4}$`);
  return regex.test(orderNumber);
}
