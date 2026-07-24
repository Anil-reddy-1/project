/**
 * Inventory Service
 * Phase 4 — Wholesaler Approval & Inventory Lock
 *
 * Manages stock operations for the single shop's product catalog.
 * All stock mutations use Firestore transactions to prevent overselling.
 *
 * Products live at: shops/{shopId}/products/{itemId}
 * Stock field: stockQty (number)
 */

import * as admin from 'firebase-admin';
import { adminDb } from '../config/firebase';

export interface InventoryItem {
  itemId: string;
  quantity: number;
}

export interface InventoryValidationResult {
  isValid: boolean;
  errors: Array<{
    itemId: string;
    requested: number;
    available: number;
    productName: string;
  }>;
}

class InventoryService {
  /**
   * Validate that sufficient stock exists for all line items.
   * Does NOT modify stock — read-only check.
   */
  async validateInventory(
    shopId: string,
    items: InventoryItem[]
  ): Promise<InventoryValidationResult> {
    const db = adminDb();
    const errors: InventoryValidationResult['errors'] = [];

    for (const item of items) {
      const productRef = db
        .collection('shops')
        .doc(shopId)
        .collection('products')
        .doc(item.itemId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        errors.push({
          itemId: item.itemId,
          requested: item.quantity,
          available: 0,
          productName: 'Unknown product',
        });
        continue;
      }

      const data = productDoc.data()!;
      const currentStock = data.stockQty ?? 0;

      if (currentStock < item.quantity) {
        errors.push({
          itemId: item.itemId,
          requested: item.quantity,
          available: currentStock,
          productName: data.name || item.itemId,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Atomically decrement stock for all items within a Firestore transaction.
   * This is called from within the order approval transaction.
   *
   * @param transaction - The active Firestore transaction
   * @param shopId - The shop ID
   * @param items - Items and quantities to lock
   * @throws Error if any product has insufficient stock
   */
  async lockInventoryInTransaction(
    transaction: admin.firestore.Transaction,
    shopId: string,
    items: InventoryItem[]
  ): Promise<void> {
    const db = adminDb();

    // Read all product docs within the transaction
    const productRefs = items.map((item) =>
      db.collection('shops').doc(shopId).collection('products').doc(item.itemId)
    );

    const productDocs = await Promise.all(
      productRefs.map((ref) => transaction.get(ref))
    );

    // Validate stock and prepare updates
    for (let i = 0; i < items.length; i++) {
      const doc = productDocs[i];
      const item = items[i];

      if (!doc.exists) {
        throw new Error(`Product ${item.itemId} not found in inventory`);
      }

      const data = doc.data()!;
      const currentStock = data.stockQty ?? 0;

      if (currentStock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${data.name}". Available: ${currentStock}, Requested: ${item.quantity}`
        );
      }

      // Decrement stock within the transaction
      transaction.update(productRefs[i], {
        stockQty: currentStock - item.quantity,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`[Inventory] Stock locked for ${items.length} items in shop ${shopId}`);
  }

  /**
   * Release (restore) inventory — used if an approved order is later cancelled
   * by admin override or system error recovery.
   */
  async releaseInventory(shopId: string, items: InventoryItem[]): Promise<void> {
    const db = adminDb();

    await db.runTransaction(async (transaction) => {
      for (const item of items) {
        const productRef = db
          .collection('shops')
          .doc(shopId)
          .collection('products')
          .doc(item.itemId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          console.warn(`[Inventory] Product ${item.itemId} not found for stock release`);
          continue;
        }

        const currentStock = productDoc.data()!.stockQty ?? 0;

        transaction.update(productRef, {
          stockQty: currentStock + item.quantity,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    console.log(`[Inventory] Stock released for ${items.length} items in shop ${shopId}`);
  }
}

export const inventoryService = new InventoryService();
