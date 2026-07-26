import { adminDb, admin } from '../config/firebase';
import { geospatialService } from './geospatial.service';
import { routeOptimizationService } from './route-optimization.service';
import { dynamicPricingService } from './dynamic-pricing.service';
import { broadcastNewAssignment } from './realtime-location.service';
import { slaTimerService } from './sla-timer.service';
import { fcmService, FCM_TEMPLATES } from './fcm.service';
import { env } from '../config/env';

interface BatchAssignmentOptions {
  orderIds: string[];
  shopLocation: { lat: number; lng: number };
  slaDurationSeconds?: number;
  assignedBy: string;
  specificPartnerId?: string;
}

interface BatchAssignment {
  batchId: string;
  orderIds: string[];
  partnerId: string;
  status: 'pending' | 'accepted' | 'declined' | 'timeout';
  optimizedRoute: {
    totalDistance: number;
    totalDuration: number;
    stops: any[];
  };
  pricing: {
    baseRate: number;
    surgeMultiplier: number;
    totalEarnings: number;
    breakdown: any;
  };
  slaDuration: number;
  createdAt: Date;
}

/**
 * Batch Assignment Service
 * Handles assigning multiple orders to a single delivery partner
 */
class BatchAssignmentService {
  /**
   * Create a batch assignment for multiple orders
   */
  async createBatchAssignment(options: BatchAssignmentOptions): Promise<BatchAssignment | null> {
    const { orderIds, shopLocation, slaDurationSeconds = 60, assignedBy, specificPartnerId } = options;
    const db = adminDb();

    try {
      // Validate batch size
      const maxBatchSize = env.MAX_BATCH_SIZE;
      if (orderIds.length > maxBatchSize) {
        console.error(`[Batch Assignment] Batch size ${orderIds.length} exceeds maximum ${maxBatchSize}`);
        return null;
      }

      // Fetch all orders
      const orders = await Promise.all(
        orderIds.map(async (orderId) => {
          const orderDoc = await db.collection('orders').doc(orderId).get();
          if (!orderDoc.exists) {
            throw new Error(`Order ${orderId} not found`);
          }
          return { id: orderId, ...orderDoc.data() } as any;
        })
      );

      // Validate all orders are ready for pickup
      const invalidOrders = orders.filter(order => order.status !== 'READY_FOR_PICKUP');
      if (invalidOrders.length > 0) {
        console.error('[Batch Assignment] Some orders are not ready for pickup:', invalidOrders.map(o => o.id));
        return null;
      }

      // Extract delivery locations
      const deliveryLocations = orders.map(order => ({
        lat: order.deliveryAddress?.coordinates?.latitude || 0,
        lng: order.deliveryAddress?.coordinates?.longitude || 0,
        address: order.deliveryAddress?.fullAddress || '',
        label: order.orderNumber,
      }));

      // Find suitable delivery partner
      let partnerId: string;
      
      if (specificPartnerId) {
        // Verify partner is available
        const partnerDoc = await db.collection('delivery_partners').doc(specificPartnerId).get();
        if (!partnerDoc.exists) {
          console.error('[Batch Assignment] Specified partner not found');
          return null;
        }
        
        const partner = partnerDoc.data();
        if (partner?.status !== 'available') {
          console.error('[Batch Assignment] Partner is not available');
          return null;
        }

        partnerId = specificPartnerId;
      } else {
        // Find nearest available partner
        const nearestPartner = await this.findSuitablePartner(shopLocation, orderIds.length);
        if (!nearestPartner) {
          console.error('[Batch Assignment] No suitable partner found for batch');
          return null;
        }
        partnerId = nearestPartner;
      }

      // Optimize route
      const optimizedRoute = await routeOptimizationService.optimizeRoute(
        shopLocation,
        deliveryLocations,
        orderIds
      );

      // Calculate distances for each delivery
      const distances = optimizedRoute.stops.map(stop => stop.distanceFromPrevious / 1000); // Convert to km

      // Calculate pricing
      const pricingBreakdown = await dynamicPricingService.calculateBatchEarnings(
        distances,
        new Date()
      );

      // Generate batch ID
      const batchNumber = await this.generateBatchNumber();

      // Create batch assignment record
      const batchAssignment: BatchAssignment = {
        batchId: batchNumber,
        orderIds,
        partnerId,
        status: 'pending',
        optimizedRoute: {
          totalDistance: optimizedRoute.totalDistance,
          totalDuration: optimizedRoute.totalDuration,
          stops: optimizedRoute.stops,
        },
        pricing: {
          baseRate: pricingBreakdown.baseRate,
          surgeMultiplier: pricingBreakdown.surgeMultiplier,
          totalEarnings: pricingBreakdown.totalEarnings,
          breakdown: pricingBreakdown,
        },
        slaDuration: slaDurationSeconds,
        createdAt: new Date(),
      };

      // Save to Firestore
      await db.collection('delivery_assignments').doc(batchNumber).set({
        ...batchAssignment,
        type: 'batch',
        batchSize: orderIds.length,
        assignedBy,
        createdAt: admin.firestore.Timestamp.now(),
      });

      // Update all orders with batch assignment
      const batch = db.batch();
      orderIds.forEach((orderId) => {
        const orderRef = db.collection('orders').doc(orderId);
        batch.update(orderRef, {
          status: 'ASSIGNED',
          deliveryPartnerId: partnerId,
          batchId: batchNumber,
          assignedAt: admin.firestore.Timestamp.now(),
          'stateHistory': admin.firestore.FieldValue.arrayUnion({
            status: 'ASSIGNED',
            timestamp: admin.firestore.Timestamp.now(),
            note: `Batch assignment ${batchNumber}`,
          }),
        });
      });
      await batch.commit();

      // Update partner order count
      const partnerRef = db.collection('delivery_partners').doc(partnerId);
      await partnerRef.update({
        currentOrderCount: admin.firestore.FieldValue.increment(orderIds.length),
      });

      // Broadcast assignment to partner via WebSocket
      await broadcastNewAssignment(partnerId, {
        assignmentId: batchNumber,
        type: 'batch',
        batchSize: orderIds.length,
        orderIds,
        pickupLocation: shopLocation,
        optimizedRoute: optimizedRoute.stops,
        earnings: pricingBreakdown.totalEarnings,
        surgeMultiplier: pricingBreakdown.surgeMultiplier,
        slaDuration: slaDurationSeconds,
        totalDistance: optimizedRoute.totalDistance / 1000, // Convert to km
        estimatedDuration: optimizedRoute.totalDuration / 60, // Convert to minutes
      });

      // Send FCM push notification
      await fcmService.sendNotification({
        userId: partnerId,
        notification: FCM_TEMPLATES.BATCH_ASSIGNMENT(orderIds.length, pricingBreakdown.totalEarnings),
        data: {
          type: 'batch_assignment',
          batchId: batchNumber,
          orderCount: orderIds.length.toString(),
          earnings: pricingBreakdown.totalEarnings.toString(),
          surgeMultiplier: pricingBreakdown.surgeMultiplier.toString(),
          clickAction: `/delivery/assignments`,
        },
        priority: 'high',
      });

      // Start SLA timer
      await slaTimerService.startTimer(batchNumber, slaDurationSeconds);

      console.log(`[Batch Assignment] Created batch ${batchNumber} for partner ${partnerId} with ${orderIds.length} orders`);

      return batchAssignment;
    } catch (error) {
      console.error('[Batch Assignment] Error creating batch assignment:', error);
      return null;
    }
  }

  /**
   * Find suitable partner for batch delivery
   */
  private async findSuitablePartner(shopLocation: { lat: number; lng: number }, batchSize: number): Promise<string | null> {
    try {
      const partners = await geospatialService.getSortedPartnersByProximity(
        { latitude: shopLocation.lat, longitude: shopLocation.lng }
      );

      for (const p of partners) {
        const partner = p as any;
        const maxBatchSize = partner.maxBatchSize || 3;
        const currentOrderCount = partner.currentOrderCount || 0;
        const maxConcurrent = partner.maxConcurrentOrders || 3;

        // Check if partner can handle this batch
        if (
          partner.status === 'available' &&
          batchSize <= maxBatchSize &&
          currentOrderCount + batchSize <= maxConcurrent
        ) {
          return partner.id;
        }
      }

      return null;
    } catch (error) {
      console.error('[Batch Assignment] Error finding suitable partner:', error);
      return null;
    }
  }

  /**
   * Handle partner response to batch assignment
   */
  async handleBatchResponse(
    batchId: string,
    partnerId: string,
    response: 'accept' | 'decline',
    reason?: string
  ): Promise<void> {
    const db = adminDb();

    try {
      const assignmentRef = db.collection('delivery_assignments').doc(batchId);
      const assignmentDoc = await assignmentRef.get();

      if (!assignmentDoc.exists) {
        throw new Error('Batch assignment not found');
      }

      const assignment = assignmentDoc.data();

      if (assignment?.partnerId !== partnerId) {
        throw new Error('This batch is not assigned to you');
      }

      if (assignment?.status !== 'pending') {
        throw new Error('Batch assignment is no longer pending');
      }

      if (response === 'accept') {
        // Accept batch
        await assignmentRef.update({
          status: 'accepted',
          acceptedAt: admin.firestore.Timestamp.now(),
        });

        // Update partner status
        await db.collection('delivery_partners').doc(partnerId).update({
          status: 'busy',
        });

        // Cancel SLA timer
        slaTimerService.cancelTimer(batchId);

        console.log(`[Batch Assignment] Partner ${partnerId} accepted batch ${batchId}`);
      } else {
        // Decline batch
        await assignmentRef.update({
          status: 'declined',
          declineReason: reason,
          declinedAt: admin.firestore.Timestamp.now(),
        });

        // Decrement partner order count
        await db.collection('delivery_partners').doc(partnerId).update({
          currentOrderCount: admin.firestore.FieldValue.increment(-assignment.batchSize),
        });

        // Reset all orders to READY_FOR_PICKUP
        const batch = db.batch();
        assignment.orderIds.forEach((orderId: string) => {
          const orderRef = db.collection('orders').doc(orderId);
          batch.update(orderRef, {
            status: 'READY_FOR_PICKUP',
            deliveryPartnerId: null,
            batchId: null,
            'stateHistory': admin.firestore.FieldValue.arrayUnion({
              status: 'READY_FOR_PICKUP',
              timestamp: admin.firestore.Timestamp.now(),
              note: `Batch declined by partner`,
            }),
          });
        });
        await batch.commit();

        // Try to reassign to another partner
        await this.reassignBatch(assignment.orderIds, assignment.pickupLocation);

        console.log(`[Batch Assignment] Partner ${partnerId} declined batch ${batchId}`);
      }
    } catch (error) {
      console.error('[Batch Assignment] Error handling batch response:', error);
      throw error;
    }
  }

  /**
   * Reassign batch to another partner
   */
  private async reassignBatch(orderIds: string[], shopLocation: { lat: number; lng: number }): Promise<void> {
    // Wait a bit before reassigning
    setTimeout(async () => {
      try {
        await this.createBatchAssignment({
          orderIds,
          shopLocation,
          assignedBy: 'system',
        });
      } catch (error) {
        console.error('[Batch Assignment] Error reassigning batch:', error);
      }
    }, 2000);
  }

  /**
   * Handle batch assignment timeout
   */
  async handleBatchTimeout(batchId: string): Promise<void> {
    const db = adminDb();

    try {
      const assignmentRef = db.collection('delivery_assignments').doc(batchId);
      const assignmentDoc = await assignmentRef.get();

      if (!assignmentDoc.exists) {
        return;
      }

      const assignment = assignmentDoc.data();

      if (assignment?.status !== 'pending') {
        return; // Already handled
      }

      await assignmentRef.update({
        status: 'timeout',
        timeoutAt: admin.firestore.Timestamp.now(),
      });

      // Decrement partner order count
      await db.collection('delivery_partners').doc(assignment.partnerId).update({
        currentOrderCount: admin.firestore.FieldValue.increment(-assignment.batchSize),
      });

      // Reset all orders
      const batch = db.batch();
      assignment.orderIds.forEach((orderId: string) => {
        const orderRef = db.collection('orders').doc(orderId);
        batch.update(orderRef, {
          status: 'READY_FOR_PICKUP',
          deliveryPartnerId: null,
          batchId: null,
          'stateHistory': admin.firestore.FieldValue.arrayUnion({
            status: 'READY_FOR_PICKUP',
            timestamp: admin.firestore.Timestamp.now(),
            note: 'Batch assignment timeout',
          }),
        });
      });
      await batch.commit();

      // Try to reassign
      await this.reassignBatch(assignment.orderIds, assignment.pickupLocation);

      console.log(`[Batch Assignment] Batch ${batchId} timed out`);
    } catch (error) {
      console.error('[Batch Assignment] Error handling timeout:', error);
    }
  }

  /**
   * Generate unique batch number
   */
  private async generateBatchNumber(): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    const db = adminDb();
    const todayBatches = await db
      .collection('delivery_assignments')
      .where('type', '==', 'batch')
      .where('createdAt', '>=', new Date(date.setHours(0, 0, 0, 0)))
      .get();

    const sequence = todayBatches.size + 1;
    return `BATCH-${dateStr}-${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Get batch assignment details
   */
  async getBatchAssignment(batchId: string): Promise<any> {
    try {
      const db = adminDb();
      const doc = await db.collection('delivery_assignments').doc(batchId).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error('[Batch Assignment] Error getting batch:', error);
      return null;
    }
  }
}

export const batchAssignmentService = new BatchAssignmentService();
