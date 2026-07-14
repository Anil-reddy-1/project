/**
 * Single Shop Validation Middleware
 * Phase 2.5 Migration - Single Shop Architecture
 * 
 * Prevents creation of multiple shops or wholesaler accounts.
 * Enforces single-shop, single-wholesaler architectural constraint.
 */

import { Request, Response, NextFunction } from 'express';
import { adminDb } from '../config/firebase';

/**
 * Middleware to prevent creation of multiple shops
 * Use this on POST /api/shops
 */
export async function preventMultipleShops(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const db = adminDb();
    const shopsSnapshot = await db.collection('shops').limit(1).get();

    if (!shopsSnapshot.empty) {
      res.status(403).json({
        success: false,
        message: 'Cannot create multiple shops. This system operates with a single shop only.',
        code: 'SINGLE_SHOP_CONSTRAINT',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[SingleShop] Failed to validate shop creation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Middleware to prevent creation of multiple wholesaler accounts
 * Use this on POST /api/users (when role === 'wholesaler')
 */
export async function preventMultipleWholesalers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Only check if creating a wholesaler
    if (req.body.role !== 'wholesaler') {
      next();
      return;
    }

    const db = adminDb();
    const wholesalersSnapshot = await db
      .collection('users')
      .where('role', '==', 'wholesaler')
      .limit(1)
      .get();

    if (!wholesalersSnapshot.empty) {
      res.status(403).json({
        success: false,
        message:
          'Cannot create multiple wholesaler accounts. This system operates with a single wholesaler only.',
        code: 'SINGLE_WHOLESALER_CONSTRAINT',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[SingleShop] Failed to validate wholesaler creation:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

/**
 * Middleware to prevent updating shop to different owner
 * Wholesaler ownership is fixed at creation
 */
export async function preventShopOwnerChange(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Only check if updating ownerUid
    if (!req.body.ownerUid) {
      next();
      return;
    }

    const db = adminDb();
    const shopId = req.params.id || req.params.shopId;
    const shopRef = db.collection('shops').doc(shopId);
    const shopDoc = await shopRef.get();

    if (!shopDoc.exists) {
      next();
      return;
    }

    const currentOwner = shopDoc.data()?.ownerUid;
    const newOwner = req.body.ownerUid;

    if (currentOwner && currentOwner !== newOwner) {
      res.status(403).json({
        success: false,
        message: 'Cannot change shop owner. Shop ownership is fixed.',
        code: 'SHOP_OWNER_FIXED',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('[SingleShop] Failed to validate shop owner change:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}
