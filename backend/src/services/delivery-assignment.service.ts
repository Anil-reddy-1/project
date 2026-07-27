import { db } from '../config/firebase';
import { geospatialService } from './geospatial.service';
import { notificationService } from './notification.service';
import { FieldValue } from 'firebase-admin/firestore';

interface DeliveryPartner {
  uid: string;
  name: string;
  phone: string;
  status: 'available' | 'busy' | 'offline';
  isOnline: boolean;
  currentLocation: {
    latitude: number;
    longitude: number;
    geohash: string;
  };
  maxConcurrentOrders: number;
  currentOrderCount: number;
  shopId: string;
  fcmToken?: string;
}

interface DeliveryAssignment {
  assignmentId: string;
  orderId: string;
  partnerId: string;
  assignedAt: FirebaseFirestore.Timestamp;
  assignedBy: string;
  assignmentMethod: 'auto' | 'manual';
  status: 'pending' | 'accepted' | 'declined' | 'timeout' | 'cancelled';
  respondedAt?: FirebaseFirestore.Timestamp;
  declineReason?: string;
  slaExpiresAt: FirebaseFirestore.Timestamp;
  slaDuration: number;
  partnerDistanceFromShop: number;
  partnerLocation: {
    latitude: number;
    longitude: number;
  };
  attemptNumber: number;
  previousAttempts?: string[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface AssignmentOptions {
  slaDurationSeconds?: number;
  assignedBy?: string;
  method?: 'auto' | 'manual';
  specificPartnerId?: string;
}

interface Order {
  orderId: string;
  shopId: string;
  state: string;
  status: string;
  assignmentAttempts?: number;
  assignedPartnerId?: string;
}

export class DeliveryAssignmentService {
  private readonly DEFAULT_SLA_SECONDS = 60;
  private readonly MAX_ASSIGNMENT_ATTEMPTS = 5;

  /**
   * Main entry point: Assign order to delivery partner
   */
  async assignOrderToPartner(
    orderId: string,
    options: AssignmentOptions = {}
  ): Promise<DeliveryAssignment | null> {
    const {
      slaDurationSeconds = this.DEFAULT_SLA_SECONDS,
      assignedBy = 'system',
      method = 'auto',
      specificPartnerId,
    } = options;

    try {
      // Get order details
      const orderDoc = await db.collection('orders').doc(orderId).get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const order = { ...orderDoc.data(), orderId } as any; // Changed to any for flexibility

      // Check if order is in correct status
      const state = order.state;
      
      if (state !== 'READY_FOR_PICKUP' && state !== 'ASSIGNED') {
        console.log(`Order ${orderId} not in an assignable status. Current: ${state}`);
        return null;
      }

      // Check assignment attempts
      const attemptNumber = (order.assignmentAttempts || 0) + 1;

      if (attemptNumber > this.MAX_ASSIGNMENT_ATTEMPTS) {
        await this.escalateToManualAssignment(orderId, 'max_attempts_exceeded');
        return null;
      }

      // Get shop location
      const shopDoc = await db.collection('shops').doc(order.shopId).get();
      const shopData = shopDoc.data();
      const shopLocation = shopData?.geopoint ? {
        latitude: shopData.geopoint.latitude,
        longitude: shopData.geopoint.longitude
      } : null;

      if (!shopLocation || !shopLocation.latitude || !shopLocation.longitude) {
        throw new Error('Shop location not available');
      }

      // Find available partners
      let partners: Array<DeliveryPartner & { distance: number }>;

      if (specificPartnerId) {
        // Manual assignment to specific partner
        const partnerDoc = await db
          .collection('delivery_partners')
          .doc(specificPartnerId)
          .get();

        if (!partnerDoc.exists) {
          throw new Error('Specified partner not found');
        }

        const partner = partnerDoc.data() as DeliveryPartner;
        const distance = geospatialService.calculateDistance(
          shopLocation.latitude,
          shopLocation.longitude,
          partner.currentLocation.latitude,
          partner.currentLocation.longitude
        );

        partners = [{ ...partner, distance }];
      } else {
        // Auto assignment: find nearby partners
        const previousAttempts = await this.getPreviousAttemptPartners(orderId);

        partners = await geospatialService.getSortedPartnersByProximity(
          shopLocation,
          {
            status: 'available',
            shopId: order.shopId,
            requireAvailableCapacity: true,
            excludePartnerIds: previousAttempts,
          }
        );
      }

      // Edge Case 1: No partners available
      if (partners.length === 0) {
        await this.escalateToManualAssignment(orderId, 'no_partners_available');
        return null;
      }

      // Try to assign to nearest partner
      const selectedPartner = partners[0];

      // Create assignment
      const assignment = await this.createAssignment(
        orderId,
        selectedPartner.uid,
        {
          slaDurationSeconds,
          assignedBy,
          method,
          distance: selectedPartner.distance,
          partnerLocation: selectedPartner.currentLocation,
          attemptNumber,
        }
      );

      // Send push notification
      await notificationService.sendDeliveryAssignment({
        partnerId: selectedPartner.uid,
        orderId,
        assignmentId: assignment.assignmentId,
        customerName: (order as any).deliveryAddress?.name || 'Customer',
        deliveryAddress: (order as any).deliveryAddress?.addressLine1 || 'Address',
        distance: selectedPartner.distance,
        slaExpiresIn: slaDurationSeconds,
      });

      // Update order
      await db.collection('orders').doc(orderId).update({
        state: 'ASSIGNED',
        assignedPartnerId: selectedPartner.uid,
        assignedAt: new Date(),
        assignmentAttempts: attemptNumber,
        updatedAt: new Date(),
      });

      console.log(
        `Assigned order ${orderId} to partner ${selectedPartner.uid} (${selectedPartner.name}) - ${selectedPartner.distance} km away`
      );

      return assignment;
    } catch (error) {
      console.error('Error assigning order:', error);
      throw error;
    }
  }

  /**
   * Create a new assignment record
   */
  private async createAssignment(
    orderId: string,
    partnerId: string,
    options: {
      slaDurationSeconds: number;
      assignedBy: string;
      method: 'auto' | 'manual';
      distance: number;
      partnerLocation: { latitude: number; longitude: number };
      attemptNumber: number;
    }
  ): Promise<DeliveryAssignment> {
    const assignmentId = db.collection('delivery_assignments').doc().id;
    const now = new Date();
    const slaExpiresAt = new Date(now.getTime() + options.slaDurationSeconds * 1000);

    // Get previous attempts
    const previousAttempts = await this.getPreviousAttemptPartners(orderId);

    const assignment: DeliveryAssignment = {
      assignmentId,
      orderId,
      partnerId,
      assignedAt: now as any,
      assignedBy: options.assignedBy,
      assignmentMethod: options.method,
      status: 'pending',
      slaExpiresAt: slaExpiresAt as any,
      slaDuration: options.slaDurationSeconds,
      partnerDistanceFromShop: options.distance,
      partnerLocation: options.partnerLocation,
      attemptNumber: options.attemptNumber,
      previousAttempts: previousAttempts,
      createdAt: now as any,
      updatedAt: now as any,
    };

    await db.collection('delivery_assignments').doc(assignmentId).set(assignment);

    // Update partner's current order count
    await db
      .collection('delivery_partners')
      .doc(partnerId)
      .update({
        currentOrderCount: FieldValue.increment(1),
        updatedAt: new Date(),
      });

    return assignment;
  }

  /**
   * Handle partner response (accept/decline)
   */
  async handlePartnerResponse(
    assignmentId: string,
    response: 'accept' | 'decline',
    reason?: string
  ): Promise<void> {
    const assignmentRef = db.collection('delivery_assignments').doc(assignmentId);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentDoc.data() as DeliveryAssignment;

    // Check if assignment is still pending
    if (assignment.status !== 'pending') {
      throw new Error(`Assignment already ${assignment.status}`);
    }

    // Check if SLA has expired
    if (new Date() > assignment.slaExpiresAt.toDate()) {
      throw new Error('Assignment has expired');
    }

    const now = new Date();

    if (response === 'accept') {
      // Partner accepted
      await assignmentRef.update({
        status: 'accepted',
        respondedAt: now,
        updatedAt: now,
      });

      // Update order status
      await db.collection('orders').doc(assignment.orderId).update({
        state: 'ASSIGNED',
        assignedPartnerId: assignment.partnerId,
        assignedAt: now,
        updatedAt: now,
      });

      // Update partner status
      await db
        .collection('delivery_partners')
        .doc(assignment.partnerId)
        .update({
          status: 'busy',
          updatedAt: now,
        });

      console.log(`Partner ${assignment.partnerId} accepted assignment ${assignmentId}`);
    } else {
      // Partner declined
      await assignmentRef.update({
        status: 'declined',
        respondedAt: now,
        declineReason: reason || 'declined_by_partner',
        updatedAt: now,
      });

      // Decrement partner's order count
      await db
        .collection('delivery_partners')
        .doc(assignment.partnerId)
        .update({
          currentOrderCount: FieldValue.increment(-1),
          updatedAt: now,
        });

      console.log(
        `Partner ${assignment.partnerId} declined assignment ${assignmentId}. Reason: ${reason}`
      );

      // Reassign to next available partner
      await this.reassignOrder(assignment.orderId);
    }
  }

  /**
   * Handle SLA timeout
   */
  async handleSLATimeout(assignmentId: string): Promise<void> {
    const assignmentRef = db.collection('delivery_assignments').doc(assignmentId);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      console.log(`Assignment ${assignmentId} not found`);
      return;
    }

    const assignment = assignmentDoc.data() as DeliveryAssignment;

    // Only process if still pending
    if (assignment.status !== 'pending') {
      return;
    }

    const now = new Date();

    // Mark as timeout
    await assignmentRef.update({
      status: 'timeout',
      respondedAt: now,
      updatedAt: now,
    });

    // Decrement partner's order count
    await db
      .collection('delivery_partners')
      .doc(assignment.partnerId)
      .update({
        currentOrderCount: FieldValue.increment(-1),
        updatedAt: now,
      });

    console.log(`Assignment ${assignmentId} timed out. Reassigning...`);

    // Reassign to next available partner
    await this.reassignOrder(assignment.orderId);
  }

  /**
   * Reassign order to next available partner
   */
  async reassignOrder(orderId: string): Promise<void> {
    try {
      console.log(`Reassigning order ${orderId}...`);
      await this.assignOrderToPartner(orderId);
    } catch (error) {
      console.error(`Error reassigning order ${orderId}:`, error);
      await this.escalateToManualAssignment(orderId, 'reassignment_failed');
    }
  }

  /**
   * Cancel an assignment
   */
  async cancelAssignment(assignmentId: string, reason: string): Promise<void> {
    const assignmentRef = db.collection('delivery_assignments').doc(assignmentId);
    const assignmentDoc = await assignmentRef.get();

    if (!assignmentDoc.exists) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentDoc.data() as DeliveryAssignment;
    const now = new Date();

    await assignmentRef.update({
      status: 'cancelled',
      declineReason: reason,
      updatedAt: now,
    });

    // Decrement partner's order count
    await db
      .collection('delivery_partners')
      .doc(assignment.partnerId)
      .update({
        currentOrderCount: FieldValue.increment(-1),
        updatedAt: now,
      });

    // Update order if still assigned to this partner
    const orderDoc = await db.collection('orders').doc(assignment.orderId).get();
    const order = orderDoc.data() as Order;

    if (order.assignedPartnerId === assignment.partnerId) {
      await db.collection('orders').doc(assignment.orderId).update({
        assignedPartnerId: null,
        state: 'READY_FOR_PICKUP',
        updatedAt: now,
      });
    }

    console.log(`Assignment ${assignmentId} cancelled. Reason: ${reason}`);
  }

  /**
   * Escalate to manual assignment
   */
  private async escalateToManualAssignment(
    orderId: string,
    reason: string
  ): Promise<void> {
    console.log(`Escalating order ${orderId} to manual assignment. Reason: ${reason}`);

    // Update order with failure reason but keep current state
    await db.collection('orders').doc(orderId).update({
      assignmentFailureReason: reason,
      updatedAt: new Date(),
    });

    // Notify wholesaler/admin
    await notificationService.notifyManualAssignmentRequired(orderId, reason);
  }

  /**
   * Get list of partners who were previously tried for this order
   */
  private async getPreviousAttemptPartners(orderId: string): Promise<string[]> {
    const assignmentsSnapshot = await db
      .collection('delivery_assignments')
      .where('orderId', '==', orderId)
      .where('status', 'in', ['declined', 'timeout'])
      .get();

    const partnerIds: string[] = [];

    assignmentsSnapshot.forEach((doc) => {
      const assignment = doc.data() as DeliveryAssignment;
      partnerIds.push(assignment.partnerId);
    });

    return partnerIds;
  }

  /**
   * Process expired assignments (called by scheduled job)
   */
  async processExpiredAssignments(): Promise<void> {
    const now = new Date();

    const expiredSnapshot = await db
      .collection('delivery_assignments')
      .where('status', '==', 'pending')
      .where('slaExpiresAt', '<=', now)
      .get();

    console.log(`Found ${expiredSnapshot.size} expired assignments`);

    const promises = expiredSnapshot.docs.map((doc) =>
      this.handleSLATimeout(doc.id)
    );

    await Promise.all(promises);
  }

  /**
   * Get assignment details
   */
  async getAssignment(assignmentId: string): Promise<DeliveryAssignment | null> {
    const assignmentDoc = await db
      .collection('delivery_assignments')
      .doc(assignmentId)
      .get();

    if (!assignmentDoc.exists) {
      return null;
    }

    return assignmentDoc.data() as DeliveryAssignment;
  }

  /**
   * Get active assignment for partner
   */
  async getActiveAssignmentForPartner(
    partnerId: string
  ): Promise<DeliveryAssignment | null> {
    const snapshot = await db
      .collection('delivery_assignments')
      .where('partnerId', '==', partnerId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as DeliveryAssignment;
  }

  /**
   * Get all assignments for an order
   */
  async getAssignmentsForOrder(orderId: string): Promise<DeliveryAssignment[]> {
    const snapshot = await db
      .collection('delivery_assignments')
      .where('orderId', '==', orderId)
      .orderBy('attemptNumber', 'asc')
      .get();

    return snapshot.docs.map((doc) => doc.data() as DeliveryAssignment);
  }
}

export const deliveryAssignmentService = new DeliveryAssignmentService();
