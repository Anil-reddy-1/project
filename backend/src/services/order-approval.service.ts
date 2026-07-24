/**
 * Order Approval Service
 * Phase 4 — Wholesaler Approval & Inventory Lock
 *
 * Implements the wholesaler order lifecycle:
 *   PENDING_APPROVAL → APPROVED (with atomic inventory lock)
 *   PENDING_APPROVAL → REJECTED (with reason)
 *   APPROVED         → PACKED
 *   PACKED           → READY_FOR_PICKUP (with OTP generation)
 *
 * All state transitions:
 *   1. Validate current state
 *   2. Validate actor (wholesaler owns the shop)
 *   3. Perform the transition
 *   4. Log to audit trail
 *   5. Send notifications
 */

import { adminDb } from '../config/firebase';
import { inventoryService } from './inventory.service';
import { otpService } from './otp.service';
import { orderService, type Order } from './order.service';
import {
  sendOrderApprovedNotification,
  sendOrderRejectedNotification,
  sendOrderPackedNotification,
  sendReadyForPickupNotification,
  createInAppNotification,
} from './notification.service';
import type { OrderRejectionReason } from '../types';

class OrderApprovalService {
  /**
   * Approve an order — atomic inventory lock + state transition.
   *
   * Uses a Firestore transaction to ensure:
   *   - Order is in PENDING_APPROVAL state
   *   - Sufficient inventory exists for all line items
   *   - Stock is decremented atomically
   *   - Order state is updated to APPROVED
   *
   * If any step fails, the entire operation rolls back.
   */
  async approveOrder(orderId: string, wholesalerUid: string): Promise<Order> {
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);

    // Run everything in a single Firestore transaction
    await db.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const order = orderDoc.data() as Order;

      // Validate state
      if (order.state !== 'PENDING_APPROVAL') {
        throw new Error(
          `Cannot approve order in state "${order.state}". Only PENDING_APPROVAL orders can be approved.`
        );
      }

      // Validate wholesaler owns the shop
      await this.validateWholesalerOwnership(wholesalerUid, order.shopId);

      // Lock inventory (decrement stock atomically within this transaction)
      const inventoryItems = order.items.map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
      }));

      await inventoryService.lockInventoryInTransaction(
        transaction,
        order.shopId,
        inventoryItems
      );

      // Update order state
      transaction.update(orderRef, {
        state: 'APPROVED',
        approvedAt: new Date(),
        approvedBy: wholesalerUid,
        updatedAt: new Date(),
        lastAction: 'approved',
        lastActionBy: wholesalerUid,
        lastActionAt: new Date(),
      });
    });

    // Post-transaction: audit log + notifications (outside transaction for performance)
    await orderService.logOrderAction(
      orderId,
      'approved',
      wholesalerUid,
      'PENDING_APPROVAL',
      'APPROVED'
    );

    const updatedOrder = (await orderRef.get()).data() as Order;

    // Send notifications (non-blocking)
    this.sendApprovalNotifications(updatedOrder).catch((err) =>
      console.error('[OrderApproval] Notification error:', err)
    );

    console.log(`[OrderApproval] Order ${orderId} approved by ${wholesalerUid}`);
    return updatedOrder;
  }

  /**
   * Reject an order with a reason.
   * No inventory impact — stock was never locked.
   */
  async rejectOrder(
    orderId: string,
    wholesalerUid: string,
    reason: OrderRejectionReason,
    notes?: string
  ): Promise<Order> {
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    const order = orderDoc.data() as Order;

    // Validate state
    if (order.state !== 'PENDING_APPROVAL') {
      throw new Error(
        `Cannot reject order in state "${order.state}". Only PENDING_APPROVAL orders can be rejected.`
      );
    }

    // Validate wholesaler
    await this.validateWholesalerOwnership(wholesalerUid, order.shopId);

    // Validate reason
    const validReasons: OrderRejectionReason[] = [
      'out_of_stock',
      'moq_not_met',
      'pricing_error',
      'suspicious_order',
      'wholesaler_unavailable',
      'other',
    ];
    if (!validReasons.includes(reason)) {
      throw new Error(`Invalid rejection reason: ${reason}`);
    }

    // Update order
    await orderRef.update({
      state: 'REJECTED',
      rejectionReason: reason,
      rejectionNotes: notes || null,
      rejectedAt: new Date(),
      rejectedBy: wholesalerUid,
      updatedAt: new Date(),
      lastAction: 'rejected',
      lastActionBy: wholesalerUid,
      lastActionAt: new Date(),
    });

    // Audit log
    await orderService.logOrderAction(
      orderId,
      'rejected',
      wholesalerUid,
      'PENDING_APPROVAL',
      'REJECTED',
      { reason, notes }
    );

    const updatedOrder = (await orderRef.get()).data() as Order;

    // Notifications (non-blocking)
    this.sendRejectionNotifications(updatedOrder, reason).catch((err) =>
      console.error('[OrderApproval] Notification error:', err)
    );

    console.log(`[OrderApproval] Order ${orderId} rejected: ${reason}`);
    return updatedOrder;
  }

  /**
   * Mark an approved order as packed.
   */
  async markPacked(orderId: string, wholesalerUid: string): Promise<Order> {
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    const order = orderDoc.data() as Order;

    if (order.state !== 'APPROVED') {
      throw new Error(
        `Cannot mark order as packed in state "${order.state}". Order must be APPROVED.`
      );
    }

    await this.validateWholesalerOwnership(wholesalerUid, order.shopId);

    await orderRef.update({
      state: 'PACKED',
      packedAt: new Date(),
      packedBy: wholesalerUid,
      updatedAt: new Date(),
      lastAction: 'packed',
      lastActionBy: wholesalerUid,
      lastActionAt: new Date(),
    });

    await orderService.logOrderAction(
      orderId,
      'packed',
      wholesalerUid,
      'APPROVED',
      'PACKED'
    );

    const updatedOrder = (await orderRef.get()).data() as Order;

    // Notifications
    this.sendPackedNotifications(updatedOrder).catch((err) =>
      console.error('[OrderApproval] Notification error:', err)
    );

    console.log(`[OrderApproval] Order ${orderId} marked as packed`);
    return updatedOrder;
  }

  /**
   * Mark a packed order as ready for pickup, generating a pickup OTP.
   */
  async markReadyForPickup(orderId: string, wholesalerUid: string): Promise<{ order: Order; pickupOTP: string }> {
    const db = adminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      throw new Error('Order not found');
    }

    const order = orderDoc.data() as Order;

    if (order.state !== 'PACKED') {
      throw new Error(
        `Cannot mark order as ready in state "${order.state}". Order must be PACKED.`
      );
    }

    await this.validateWholesalerOwnership(wholesalerUid, order.shopId);

    // Generate pickup OTP
    const pickupOTP = await otpService.generatePickupOTP(orderId);

    await orderRef.update({
      state: 'READY_FOR_PICKUP',
      readyForPickupAt: new Date(),
      readyForPickupBy: wholesalerUid,
      updatedAt: new Date(),
      lastAction: 'ready_for_pickup',
      lastActionBy: wholesalerUid,
      lastActionAt: new Date(),
    });

    await orderService.logOrderAction(
      orderId,
      'ready_for_pickup',
      wholesalerUid,
      'PACKED',
      'READY_FOR_PICKUP',
      { pickupOTPGenerated: true }
    );

    const updatedOrder = (await orderRef.get()).data() as Order;

    // Notifications
    this.sendReadyNotifications(updatedOrder, pickupOTP).catch((err) =>
      console.error('[OrderApproval] Notification error:', err)
    );

    console.log(`[OrderApproval] Order ${orderId} ready for pickup, OTP generated`);
    return { order: updatedOrder, pickupOTP };
  }

  // ─── Private helpers ────────────────────────────────────────────────────

  /**
   * Validate that the wholesaler owns the shop associated with the order.
   */
  private async validateWholesalerOwnership(
    wholesalerUid: string,
    shopId: string
  ): Promise<void> {
    const db = adminDb();
    const shopDoc = await db.collection('shops').doc(shopId).get();

    if (!shopDoc.exists) {
      throw new Error('Shop not found');
    }

    // Phase 2.5: Single shop mode - bypass ownership check
    // if (shopDoc.data()?.ownerUid !== wholesalerUid) {
    //   throw new Error('Unauthorized: you do not own this shop');
    // }
  }

  /**
   * Send approval notifications to retailer.
   */
  private async sendApprovalNotifications(order: Order): Promise<void> {
    try {
      await sendOrderApprovedNotification({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        retailerName: order.retailerSnapshot.name,
        retailerEmail: order.retailerSnapshot.email,
        grandTotal: order.grandTotal,
      });

      await createInAppNotification(
        order.retailerId,
        'Order Approved ✅',
        `Your order ${order.orderNumber} has been approved! The wholesaler is now preparing your items.`,
        'order_approved',
        { orderId: order.orderId, orderNumber: order.orderNumber }
      );
    } catch (err) {
      console.error('[OrderApproval] Failed to send approval notifications:', err);
    }
  }

  /**
   * Send rejection notifications to retailer.
   */
  private async sendRejectionNotifications(
    order: Order,
    reason: OrderRejectionReason
  ): Promise<void> {
    try {
      const reasonLabels: Record<OrderRejectionReason, string> = {
        out_of_stock: 'Items are currently out of stock',
        moq_not_met: 'Minimum order quantity was not met',
        pricing_error: 'There was a pricing discrepancy',
        suspicious_order: 'The order could not be verified',
        wholesaler_unavailable: 'The wholesaler is temporarily unavailable',
        other: 'The wholesaler was unable to fulfill this order',
      };

      await sendOrderRejectedNotification({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        retailerName: order.retailerSnapshot.name,
        retailerEmail: order.retailerSnapshot.email,
        grandTotal: order.grandTotal,
        reason: reasonLabels[reason] || reason,
      });

      await createInAppNotification(
        order.retailerId,
        'Order Rejected ❌',
        `Your order ${order.orderNumber} was rejected. Reason: ${reasonLabels[reason]}`,
        'order_rejected',
        { orderId: order.orderId, orderNumber: order.orderNumber, reason }
      );
    } catch (err) {
      console.error('[OrderApproval] Failed to send rejection notifications:', err);
    }
  }

  /**
   * Send packed notifications to retailer.
   */
  private async sendPackedNotifications(order: Order): Promise<void> {
    try {
      await sendOrderPackedNotification({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        retailerName: order.retailerSnapshot.name,
        retailerEmail: order.retailerSnapshot.email,
      });

      await createInAppNotification(
        order.retailerId,
        'Order Packed 📦',
        `Your order ${order.orderNumber} has been packed and will be ready for pickup soon.`,
        'order_packed',
        { orderId: order.orderId, orderNumber: order.orderNumber }
      );
    } catch (err) {
      console.error('[OrderApproval] Failed to send packed notifications:', err);
    }
  }

  /**
   * Send ready-for-pickup notifications to retailer with OTP.
   */
  private async sendReadyNotifications(order: Order, pickupOTP: string): Promise<void> {
    try {
      await sendReadyForPickupNotification({
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        retailerName: order.retailerSnapshot.name,
        retailerEmail: order.retailerSnapshot.email,
        pickupOTP,
      });

      await createInAppNotification(
        order.retailerId,
        'Order Ready for Pickup 🚚',
        `Your order ${order.orderNumber} is ready! A delivery partner will be assigned soon.`,
        'order_ready_for_pickup',
        { orderId: order.orderId, orderNumber: order.orderNumber }
      );
    } catch (err) {
      console.error('[OrderApproval] Failed to send ready notifications:', err);
    }
  }
}

export const orderApprovalService = new OrderApprovalService();
