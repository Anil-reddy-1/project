import { adminDb, admin } from '../config/firebase';
import { emitToOrder, emitToRole, emitToPartner } from '../config/socket';

/**
 * Real-time Location Broadcast Service
 * Handles location updates via WebSocket and Firestore persistence
 */

interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: Date;
}

interface PartnerLocationUpdate extends LocationUpdate {
  partnerId: string;
  orderId?: string;
  status: 'available' | 'busy' | 'offline';
}

/**
 * Update partner location in Firestore and broadcast via WebSocket
 */
export async function updatePartnerLocation(
  partnerId: string,
  location: LocationUpdate,
  orderId?: string
): Promise<void> {
  try {
    const db = adminDb();
    
    // Update in delivery_partners collection
    const partnerRef = db.collection('delivery_partners').doc(partnerId);
    await partnerRef.update({
      currentLocation: {
        coordinates: new admin.firestore.GeoPoint(location.lat, location.lng),
        accuracy: location.accuracy,
        updatedAt: admin.firestore.Timestamp.now(),
      },
      lastSeen: admin.firestore.Timestamp.now(),
    });

    // If tracking an order, update order location too
    if (orderId) {
      const orderRef = db.collection('orders').doc(orderId);
      await orderRef.update({
        'deliveryPartnerLocation': {
          coordinates: new admin.firestore.GeoPoint(location.lat, location.lng),
          accuracy: location.accuracy,
          updatedAt: admin.firestore.Timestamp.now(),
        },
      });

      // Broadcast to everyone tracking this order
      emitToOrder(orderId, 'location:update', {
        orderId,
        partnerId,
        location: {
          lat: location.lat,
          lng: location.lng,
          accuracy: location.accuracy,
        },
        timestamp: location.timestamp.toISOString(),
      });
    }

    // Broadcast to wholesaler and admin (for live tracking dashboard)
    emitToRole('wholesaler', 'location:partner_update', {
      partnerId,
      orderId,
      location: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      },
      timestamp: location.timestamp.toISOString(),
    });

    emitToRole('admin', 'location:partner_update', {
      partnerId,
      orderId,
      location: {
        lat: location.lat,
        lng: location.lng,
        accuracy: location.accuracy,
      },
      timestamp: location.timestamp.toISOString(),
    });

    console.log(`[Realtime Location] Updated location for partner ${partnerId}`);
  } catch (error) {
    console.error('[Realtime Location] Error updating location:', error);
    throw error;
  }
}

/**
 * Update order status and broadcast via WebSocket
 */
export async function broadcastOrderStatus(
  orderId: string,
  status: string,
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    // Broadcast to all tracking this order
    emitToOrder(orderId, 'order:status_update', {
      orderId,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });

    console.log(`[Realtime Location] Broadcasted status update for order ${orderId}: ${status}`);
  } catch (error) {
    console.error('[Realtime Location] Error broadcasting order status:', error);
  }
}

/**
 * Update partner status and broadcast via WebSocket
 */
export async function broadcastPartnerStatus(
  partnerId: string,
  status: 'available' | 'busy' | 'offline',
  additionalData?: Record<string, any>
): Promise<void> {
  try {
    const db = adminDb();
    
    // Update in Firestore
    const partnerRef = db.collection('delivery_partners').doc(partnerId);
    await partnerRef.update({
      status,
      lastStatusChange: admin.firestore.Timestamp.now(),
    });

    // Broadcast to wholesaler and admin
    emitToRole('wholesaler', 'partner:status_update', {
      partnerId,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });

    emitToRole('admin', 'partner:status_update', {
      partnerId,
      status,
      timestamp: new Date().toISOString(),
      ...additionalData,
    });

    console.log(`[Realtime Location] Broadcasted status update for partner ${partnerId}: ${status}`);
  } catch (error) {
    console.error('[Realtime Location] Error broadcasting partner status:', error);
    throw error;
  }
}

/**
 * Broadcast new assignment to partner
 */
export async function broadcastNewAssignment(
  partnerId: string,
  assignmentData: Record<string, any>
): Promise<void> {
  try {
    // Send to specific partner
    emitToPartner(partnerId, 'assignment:new', {
      ...assignmentData,
      timestamp: new Date().toISOString(),
    });

    console.log(`[Realtime Location] Broadcasted new assignment to partner ${partnerId}`);
  } catch (error) {
    console.error('[Realtime Location] Error broadcasting assignment:', error);
  }
}

/**
 * Broadcast assignment response (accepted/declined)
 */
export async function broadcastAssignmentResponse(
  assignmentId: string,
  partnerId: string,
  response: 'accepted' | 'declined',
  orderId: string
): Promise<void> {
  try {
    // Notify wholesaler and admin
    emitToRole('wholesaler', 'assignment:response', {
      assignmentId,
      partnerId,
      response,
      orderId,
      timestamp: new Date().toISOString(),
    });

    emitToRole('admin', 'assignment:response', {
      assignmentId,
      partnerId,
      response,
      orderId,
      timestamp: new Date().toISOString(),
    });

    // If accepted, notify the retailer who placed the order
    if (response === 'accepted') {
      const db = adminDb();
      const orderDoc = await db.collection('orders').doc(orderId).get();
      if (orderDoc.exists) {
        const order = orderDoc.data();
        emitToOrder(orderId, 'assignment:accepted', {
          assignmentId,
          partnerId,
          orderId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    console.log(`[Realtime Location] Broadcasted assignment ${response} for ${assignmentId}`);
  } catch (error) {
    console.error('[Realtime Location] Error broadcasting assignment response:', error);
  }
}

/**
 * Get all active delivery partners (for live tracking dashboard)
 */
export async function getActivePartners(): Promise<any[]> {
  try {
    const db = adminDb();
    const snapshot = await db
      .collection('delivery_partners')
      .where('status', 'in', ['available', 'busy'])
      .where('lastSeen', '>', new Date(Date.now() - 5 * 60 * 1000)) // Active in last 5 minutes
      .get();

    const partners = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      currentLocation: doc.data().currentLocation?.coordinates
        ? {
            lat: doc.data().currentLocation.coordinates.latitude,
            lng: doc.data().currentLocation.coordinates.longitude,
            accuracy: doc.data().currentLocation.accuracy,
            updatedAt: doc.data().currentLocation.updatedAt?.toDate(),
          }
        : null,
    }));

    return partners;
  } catch (error) {
    console.error('[Realtime Location] Error getting active partners:', error);
    return [];
  }
}
