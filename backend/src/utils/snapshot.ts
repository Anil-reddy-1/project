/**
 * Snapshot Creator Utilities
 * Derived from: Phase 3 Implementation Plan §8.4.3
 * 
 * Creates immutable snapshots of products, prices, and user data at order time.
 * These snapshots prevent retroactive changes from affecting order history.
 */

import { adminDb } from '../config/firebase';

export interface ProductSnapshot {
  name: string;
  description: string;
  imageUrl: string;
  category: string;
  sku?: string;
  barcode?: string;
}

export interface PriceSnapshot {
  unitPrice: number;
  moq: number;
  currency: string;
}

export interface RetailerSnapshot {
  name: string;
  email: string;
  phone: string;
}

export interface ShopSnapshot {
  name: string;
  phone: string;
  address: string;
}

/**
 * Create immutable product snapshot
 * 
 * @param itemId - Item/Product document ID
 * @returns Product snapshot data
 */
export async function createProductSnapshot(itemId: string): Promise<ProductSnapshot> {
  const db = adminDb();
  const itemRef = db.collection('items').doc(itemId);
  const itemDoc = await itemRef.get();
  
  if (!itemDoc.exists) {
    throw new Error(`Item not found: ${itemId}`);
  }
  
  const item = itemDoc.data()!;
  
  return {
    name: item.name || 'Unknown Product',
    description: item.description || '',
    imageUrl: item.imageUrl || '',
    category: item.category || 'Uncategorized',
    sku: item.sku,
    barcode: item.barcode,
  };
}

/**
 * Create immutable price snapshot
 * 
 * @param itemId - Item/Product document ID
 * @returns Price snapshot data
 */
export async function createPriceSnapshot(itemId: string): Promise<PriceSnapshot> {
  const db = adminDb();
  const itemRef = db.collection('items').doc(itemId);
  const itemDoc = await itemRef.get();
  
  if (!itemDoc.exists) {
    throw new Error(`Item not found: ${itemId}`);
  }
  
  const item = itemDoc.data()!;
  
  return {
    unitPrice: item.price || 0,
    moq: item.moq || 1,
    currency: 'INR',
  };
}

/**
 * Create immutable retailer snapshot
 * 
 * @param userId - Retailer's Firebase UID
 * @returns Retailer snapshot data
 */
export async function createRetailerSnapshot(userId: string): Promise<RetailerSnapshot> {
  const db = adminDb();
  const userRef = db.collection('users').doc(userId);
  const userDoc = await userRef.get();
  
  if (!userDoc.exists) {
    throw new Error(`User not found: ${userId}`);
  }
  
  const user = userDoc.data()!;
  
  return {
    name: user.name || 'Unknown User',
    email: user.email || '',
    phone: user.phone || '',
  };
}

/**
 * Create immutable shop snapshot
 * 
 * @param shopId - Shop document ID
 * @returns Shop snapshot data
 */
export async function createShopSnapshot(shopId: string): Promise<ShopSnapshot> {
  const db = adminDb();
  const shopRef = db.collection('shops').doc(shopId);
  const shopDoc = await shopRef.get();
  
  if (!shopDoc.exists) {
    throw new Error(`Shop not found: ${shopId}`);
  }
  
  const shop = shopDoc.data()!;
  
  return {
    name: shop.name || 'Unknown Shop',
    phone: shop.phone || '',
    address: shop.address || '',
  };
}

/**
 * Get the single wholesaler's shop ID
 * Since this is a single-shop platform, we fetch the first (and only) shop.
 * 
 * @returns Shop ID
 */
export async function getSingleShopId(): Promise<string> {
  const db = adminDb();
  const shopsSnapshot = await db.collection('shops').limit(1).get();
  
  if (shopsSnapshot.empty) {
    throw new Error('No shop found in system. Please create a shop first.');
  }
  
  return shopsSnapshot.docs[0].id;
}

/**
 * Get the single wholesaler's user ID
 * 
 * @returns Wholesaler user ID
 */
export async function getSingleWholesalerId(): Promise<string> {
  const db = adminDb();
  const usersSnapshot = await db
    .collection('users')
    .where('role', '==', 'wholesaler')
    .limit(1)
    .get();
  
  if (usersSnapshot.empty) {
    throw new Error('No wholesaler found in system.');
  }
  
  return usersSnapshot.docs[0].id;
}
