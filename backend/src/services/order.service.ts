/**
 * Order Service
 * Derived from: Phase 3 Implementation Plan §8.3.1
 * 
 * Core order management service:
 * - Order creation with validation
 * - Calculate order totals
 * - Create item/price snapshots
 * - Order state management
 * - Audit logging
 * - Role-based access control
 */

import { adminDb } from '../config/firebase';
import { cartValidationService } from './cart-validation.service';
import { paymentService } from './payment.service';
import { generateOrderNumber } from '../utils/order-number';
import { calculatePricingBreakdown } from '../utils/pricing';
import {
  createProductSnapshot,
  createPriceSnapshot,
  createRetailerSnapshot,
  createShopSnapshot,
  getSingleShopId,
  getSingleWholesalerId,
} from '../utils/snapshot';
import type { OrderState, PaymentMethod, UserRole } from '../types';

export interface CartItem {
  itemId: string;
  quantity: number;
}

export interface DeliveryAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  landmark?: string;
}

export interface OrderItem {
  itemId: string;
  productSnapshot: {
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    sku?: string;
    barcode?: string;
  };
  priceSnapshot: {
    unitPrice: number;
    moq: number;
    currency: string;
  };
  quantity: number;
  itemTotal: number;
  availableStock: number;
}

export interface Order {
  orderId: string;
  orderNumber: string;
  state: OrderState;
  retailerId: string;
  retailerSnapshot: {
    name: string;
    email: string;
    phone: string;
  };
  shopId: string;
  shopSnapshot: {
    name: string;
    phone: string;
    address: string;
  };
  wholesalerId: string;
  items: OrderItem[];
  subtotal: number;
  taxAmount: number;
  taxPercentage: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  deliveryAddress: DeliveryAddress;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  paymentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  placedAt?: Date;
  lastActionBy?: string;
  lastActionAt?: Date;
  lastAction?: string;
}

export interface OrderFilters {
  page?: number;
  limit?: number;
  state?: OrderState;
  paymentStatus?: string;
}

export class OrderService {
  /**
   * Create a new order
   */
  async createOrder(
    retailerId: string,
    items: CartItem[],
    deliveryAddress: DeliveryAddress,
    paymentMethod: PaymentMethod
  ): Promise<Order> {
    try {
      console.log('[Order] Creating order for retailer:', retailerId);

      // Validate cart items
      const validation = await cartValidationService.validateCart(items);
      if (!validation.isValid) {
        throw new Error(
          `Cart validation failed: ${validation.errors.map((e) => e.error).join(', ')}`
        );
      }

      // Create item snapshots with pricing
      const orderItems = await this.createItemSnapshots(items);

      // Calculate totals
      const totals = calculatePricingBreakdown(
        orderItems.map(item => ({
          unitPrice: item.priceSnapshot.unitPrice,
          quantity: item.quantity
        }))
      );

      // Get single shop and wholesaler IDs
      const shopId = await getSingleShopId();
      const wholesalerId = await getSingleWholesalerId();

      // Create snapshots
      const retailerSnapshot = await createRetailerSnapshot(retailerId);
      const shopSnapshot = await createShopSnapshot(shopId);

      // Generate order number
      const orderNumber = await generateOrderNumber();

      // Create order document
      const db = adminDb();
      const orderRef = db.collection('orders').doc();
      const order: Order = {
        orderId: orderRef.id,
        orderNumber,
        state: 'PENDING_APPROVAL',
        retailerId,
        retailerSnapshot,
        shopId,
        shopSnapshot,
        wholesalerId,
        items: orderItems,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        taxPercentage: totals.taxPercentage,
        deliveryCharge: totals.deliveryCharge,
        discount: totals.discount,
        grandTotal: totals.grandTotal,
        deliveryAddress,
        paymentMethod,
        paymentStatus: 'pending',
        createdAt: new Date(),
        updatedAt: new Date(),
        placedAt: new Date(),
        lastAction: 'placed',
        lastActionBy: retailerId,
        lastActionAt: new Date(),
      };

      // Handle payment based on method
      if (paymentMethod === 'prepaid') {
        // Initiate PhonePe payment
        const { payment, redirectUrl } = await paymentService.initiatePhonePePayment(
          order.orderId,
          order.grandTotal,
          retailerId
        );

        order.paymentId = payment.paymentId;

        // Save order
        await orderRef.set(order);

        // Log order creation
        await this.logOrderAction(
          order.orderId,
          'placed',
          retailerId,
          undefined,
          'PENDING_APPROVAL',
          { paymentMethod: 'prepaid', paymentId: payment.paymentId }
        );

        console.log('[Order] Order created with prepaid payment:', order.orderId);

        // Return order with redirect URL (will be handled by route)
        return { ...order, redirectUrl } as any;
      } else {
        // COD payment
        const payment = await paymentService.createCODPayment(order.orderId, order.grandTotal);
        order.paymentId = payment.paymentId;

        // Save order
        await orderRef.set(order);

        // Log order creation
        await this.logOrderAction(
          order.orderId,
          'placed',
          retailerId,
          undefined,
          'PENDING_APPROVAL',
          { paymentMethod: 'cod', paymentId: payment.paymentId }
        );

        console.log('[Order] Order created with COD:', order.orderId);

        return order;
      }
    } catch (error) {
      console.error('[Order] Failed to create order:', error);
      throw error;
    }
  }

  /**
   * Create product and price snapshots for cart items
   */
  async createItemSnapshots(items: CartItem[]): Promise<OrderItem[]> {
    const db = adminDb();
    const orderItems: OrderItem[] = [];

    // Get the single shop ID (Phase 2.5: one shop system)
    const shopId = await getSingleShopId();

    for (const item of items) {
      const productSnapshot = await createProductSnapshot(item.itemId);
      const priceSnapshot = await createPriceSnapshot(item.itemId);

      // Fetch current stock for snapshot
      const itemRef = db.collection('shops').doc(shopId).collection('products').doc(item.itemId);
      const itemDoc = await itemRef.get();
      const itemData = itemDoc.data()!;

      const itemTotal = priceSnapshot.unitPrice * item.quantity;

      orderItems.push({
        itemId: item.itemId,
        productSnapshot,
        priceSnapshot,
        quantity: item.quantity,
        itemTotal,
        availableStock: itemData.stock || itemData.stockQty || 0,
      });
    }

    return orderItems;
  }

  /**
   * Get orders for a user (role-based filtering)
   */
  async getOrdersForUser(
    userId: string,
    role: UserRole,
    filters: OrderFilters = {}
  ): Promise<{ orders: Order[]; pagination: any }> {
    try {
      const db = adminDb();
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;

      let query: any = db.collection('orders');

      // Role-based filtering
      if (role === 'retailer') {
        query = query.where('retailerId', '==', userId);
      } else if (role === 'wholesaler') {
        // Phase 2.5: Single shop - any wholesaler account sees all orders
        // (Bypass wholesalerId check to allow multiple test accounts to view orders)
      }
      // Admin sees all orders

      // State filter
      if (filters.state) {
        query = query.where('state', '==', filters.state);
      }

      // Payment status filter
      if (filters.paymentStatus) {
        query = query.where('paymentStatus', '==', filters.paymentStatus);
      }

      // Get all matching orders (no orderBy to avoid composite index requirements)
      const ordersSnapshot = await query.get();
      let orders: Order[] = ordersSnapshot.docs.map((doc: any) => doc.data() as Order);

      // Sort in memory by createdAt (newest first)
      orders.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 
                     (a.createdAt && typeof (a.createdAt as any).toDate === 'function' ? (a.createdAt as any).toDate().getTime() : 
                     new Date(a.createdAt).getTime());
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 
                     (b.createdAt && typeof (b.createdAt as any).toDate === 'function' ? (b.createdAt as any).toDate().getTime() : 
                     new Date(b.createdAt).getTime());
        return dateB - dateA;
      });

      const total = orders.length;

      // Apply pagination in memory
      const paginatedOrders = orders.slice(offset, offset + limit);

      return {
        orders: paginatedOrders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      console.error('[Order] Failed to get orders:', error);
      throw error;
    }
  }

  /**
   * Get single order by ID with access control
   */
  async getOrderById(orderId: string, userId: string, role: UserRole): Promise<Order> {
    try {
      const db = adminDb();
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const order = orderDoc.data() as Order;

      // Access control
      if (role === 'retailer' && order.retailerId !== userId) {
        throw new Error('Unauthorized access to order');
      }

      if (role === 'wholesaler') {
        // Phase 2.5: Single shop - any wholesaler account can access the order
        // (Bypass wholesalerId check to allow multiple test accounts)
      }

      // Admin has access to all orders

      return order;
    } catch (error) {
      console.error('[Order] Failed to get order:', error);
      throw error;
    }
  }

  /**
   * Cancel order (only allowed in PENDING_APPROVAL state)
   */
  async cancelOrder(orderId: string, userId: string, reason: string): Promise<Order> {
    try {
      const db = adminDb();
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const order = orderDoc.data() as Order;

      // Check if order can be cancelled
      if (order.state !== 'PENDING_APPROVAL') {
        throw new Error('Order cannot be cancelled in current state');
      }

      // Update order state
      await orderRef.update({
        state: 'CANCELLED',
        updatedAt: new Date(),
        lastAction: 'cancelled',
        lastActionBy: userId,
        lastActionAt: new Date(),
      });

      // Log cancellation
      await this.logOrderAction(
        orderId,
        'cancelled',
        userId,
        'PENDING_APPROVAL',
        'CANCELLED',
        { reason }
      );

      console.log('[Order] Order cancelled:', orderId);

      // Fetch updated order
      const updatedDoc = await orderRef.get();
      return updatedDoc.data() as Order;
    } catch (error) {
      console.error('[Order] Failed to cancel order:', error);
      throw error;
    }
  }

  /**
   * Update order state (used internally by other services)
   */
  async updateOrderState(
    orderId: string,
    newState: OrderState,
    actorId: string,
    metadata?: any
  ): Promise<Order> {
    try {
      const db = adminDb();
      const orderRef = db.collection('orders').doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const order = orderDoc.data() as Order;
      const oldState = order.state;

      // Update order
      await orderRef.update({
        state: newState,
        updatedAt: new Date(),
        lastActionBy: actorId,
        lastActionAt: new Date(),
        ...metadata,
      });

      // Log state change
      await this.logOrderAction(orderId, 'state_changed', actorId, oldState, newState, metadata);

      console.log('[Order] Order state updated:', { orderId, oldState, newState });

      // Fetch updated order
      const updatedDoc = await orderRef.get();
      return updatedDoc.data() as Order;
    } catch (error) {
      console.error('[Order] Failed to update order state:', error);
      throw error;
    }
  }

  /**
   * Update order payment status
   */
  async updateOrderPaymentStatus(
    orderId: string,
    paymentStatus: string,
    actorId: string
  ): Promise<void> {
    try {
      const db = adminDb();
      const orderRef = db.collection('orders').doc(orderId);

      await orderRef.update({
        paymentStatus,
        updatedAt: new Date(),
        lastAction: 'payment_updated',
        lastActionBy: actorId,
        lastActionAt: new Date(),
      });

      // Log payment status change
      await this.logOrderAction(orderId, 'payment_updated', actorId, undefined, undefined, {
        paymentStatus,
      });

      console.log('[Order] Payment status updated:', { orderId, paymentStatus });
    } catch (error) {
      console.error('[Order] Failed to update payment status:', error);
      throw error;
    }
  }

  /**
   * Log order action to audit log
   */
  async logOrderAction(
    orderId: string,
    action: string,
    actorId: string,
    beforeState?: OrderState | string,
    afterState?: OrderState | string,
    metadata?: any
  ): Promise<void> {
    try {
      const db = adminDb();
      const logRef = db.collection('order_audit_log').doc();

      // Fetch user role
      const userRef = db.collection('users').doc(actorId);
      const userDoc = await userRef.get();
      const actorRole = userDoc.exists ? userDoc.data()?.role : 'system';

      await logRef.set({
        logId: logRef.id,
        orderId,
        action,
        actorId,
        actorRole,
        beforeState: beforeState || null,
        afterState: afterState || null,
        metadata: metadata || null,
        timestamp: new Date(),
      });

      console.log('[Order] Action logged:', { orderId, action });
    } catch (error) {
      console.error('[Order] Failed to log order action:', error);
      // Don't throw - logging failure shouldn't break order operations
    }
  }

  /**
   * Get order audit log
   */
  async getOrderAuditLog(orderId: string): Promise<any[]> {
    try {
      const db = adminDb();
      const logsSnapshot = await db
        .collection('order_audit_log')
        .where('orderId', '==', orderId)
        .orderBy('timestamp', 'desc')
        .get();

      return logsSnapshot.docs.map((doc) => doc.data());
    } catch (error) {
      console.error('[Order] Failed to get audit log:', error);
      return [];
    }
  }
}

// Export singleton instance
export const orderService = new OrderService();
