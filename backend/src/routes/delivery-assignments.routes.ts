import { Router } from 'express';
import { verifyFirebaseToken as authenticateToken } from '../middleware/auth';
import { deliveryAssignmentService } from '../services/delivery-assignment.service';
import { geospatialService } from '../services/geospatial.service';
import { slaTimerService } from '../services/sla-timer.service';
import { db } from '../config/firebase';

const router = Router();

/**
 * POST /api/delivery-assignments/assign
 * Assign order to delivery partner (wholesaler/admin only)
 */
router.post('/assign', authenticateToken, async (req, res) => {
  try {
    const { orderId, specificPartnerId, slaDurationSeconds } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    // Check authorization (wholesaler or admin)
    if (req.user?.role !== 'wholesaler' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only wholesaler or admin can assign deliveries' });
    }

    const assignment = await deliveryAssignmentService.assignOrderToPartner(orderId, {
      specificPartnerId,
      slaDurationSeconds: slaDurationSeconds || 60,
      assignedBy: req.user.uid,
      method: specificPartnerId ? 'manual' : 'auto',
    });

    if (!assignment) {
      return res.status(400).json({
        error: 'Could not assign order',
        message: 'No available partners or max attempts reached',
      });
    }

    // Start SLA timer
    await slaTimerService.startTimer(assignment.assignmentId, assignment.slaDuration);

    res.json({
      success: true,
      assignment,
    });
  } catch (error: any) {
    console.error('Error assigning delivery:', error);
    res.status(500).json({ error: error.message || 'Failed to assign delivery' });
  }
});

/**
 * POST /api/delivery-assignments/:assignmentId/respond
 * Partner accepts or declines assignment
 */
router.post('/:assignmentId/respond', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { response, reason } = req.body;

    if (!response || !['accept', 'decline'].includes(response)) {
      return res.status(400).json({ error: 'Invalid response. Must be "accept" or "decline"' });
    }

    // Check authorization (delivery partner only)
    if (req.user?.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery partners can respond to assignments' });
    }

    // Verify assignment belongs to this partner
    const assignment = await deliveryAssignmentService.getAssignment(assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    if (assignment.partnerId !== req.user.uid) {
      return res.status(403).json({ error: 'This assignment is not assigned to you' });
    }

    // Handle response
    await deliveryAssignmentService.handlePartnerResponse(
      assignmentId,
      response,
      reason
    );

    // Cancel SLA timer if accepted
    if (response === 'accept') {
      slaTimerService.cancelTimer(assignmentId);
    }

    res.json({
      success: true,
      message: response === 'accept' ? 'Assignment accepted' : 'Assignment declined',
    });
  } catch (error: any) {
    console.error('Error responding to assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to process response' });
  }
});

/**
 * GET /api/delivery-assignments/:assignmentId
 * Get assignment details
 */
router.get('/:assignmentId', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await deliveryAssignmentService.getAssignment(assignmentId);

    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    // Check authorization
    const canView =
      req.user?.role === 'wholesaler' ||
      req.user?.role === 'admin' ||
      (req.user?.role === 'delivery' && assignment.partnerId === req.user.uid);

    if (!canView) {
      return res.status(403).json({ error: 'Not authorized to view this assignment' });
    }

    // Get timer info
    const timerInfo = await slaTimerService.getTimerInfo(assignmentId);

    res.json({
      success: true,
      assignment,
      timerInfo,
    });
  } catch (error: any) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignment' });
  }
});

/**
 * GET /api/delivery-assignments/order/:orderId
 * Get all assignments for an order
 */
router.get('/order/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check authorization
    if (req.user?.role !== 'wholesaler' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only wholesaler or admin can view order assignments' });
    }

    const assignments = await deliveryAssignmentService.getAssignmentsForOrder(orderId);

    res.json({
      success: true,
      assignments,
    });
  } catch (error: any) {
    console.error('Error fetching order assignments:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch assignments' });
  }
});

/**
 * GET /api/delivery-assignments/partner/active
 * Get active assignment for current partner
 */
router.get('/partner/active', authenticateToken, async (req, res) => {
  try {
    // Check authorization
    if (req.user?.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery partners can access this endpoint' });
    }

    const assignment = await deliveryAssignmentService.getActiveAssignmentForPartner(
      req.user.uid
    );

    if (!assignment) {
      return res.json({
        success: true,
        assignment: null,
      });
    }

    // Get timer info
    const timerInfo = await slaTimerService.getTimerInfo(assignment.assignmentId);

    res.json({
      success: true,
      assignment,
      timerInfo,
    });
  } catch (error: any) {
    console.error('Error fetching active assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch active assignment' });
  }
});

/**
 * POST /api/delivery-assignments/:assignmentId/cancel
 * Cancel an assignment (wholesaler/admin only)
 */
router.post('/:assignmentId/cancel', authenticateToken, async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const { reason } = req.body;

    // Check authorization
    if (req.user?.role !== 'wholesaler' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only wholesaler or admin can cancel assignments' });
    }

    if (!reason) {
      return res.status(400).json({ error: 'Cancellation reason is required' });
    }

    await deliveryAssignmentService.cancelAssignment(assignmentId, reason);

    // Cancel SLA timer
    slaTimerService.cancelTimer(assignmentId);

    res.json({
      success: true,
      message: 'Assignment cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling assignment:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel assignment' });
  }
});

/**
 * POST /api/delivery-assignments/partner/location
 * Update partner's current location
 */
router.post('/partner/location', authenticateToken, async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    // Check authorization
    if (req.user?.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery partners can update location' });
    }

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    await geospatialService.updatePartnerLocation(
      req.user.uid,
      { latitude, longitude },
      accuracy || 50
    );

    res.json({
      success: true,
      message: 'Location updated',
    });
  } catch (error: any) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: error.message || 'Failed to update location' });
  }
});

/**
 * GET /api/delivery-assignments/partner/status
 * Get partner's current status and stats
 */
router.get('/partner/status', authenticateToken, async (req, res) => {
  try {
    // Check authorization
    if (req.user?.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery partners can access this endpoint' });
    }

    const partnerDoc = await db.collection('delivery_partners').doc(req.user.uid).get();

    if (!partnerDoc.exists) {
      return res.status(404).json({ error: 'Partner profile not found' });
    }

    const partner = partnerDoc.data();

    res.json({
      success: true,
      status: partner?.status,
      isOnline: partner?.isOnline,
      currentOrderCount: partner?.currentOrderCount || 0,
      maxConcurrentOrders: partner?.maxConcurrentOrders || 2,
      todayDeliveryCount: partner?.todayDeliveryCount || 0,
      rating: partner?.rating || 0,
      totalDeliveries: partner?.totalDeliveries || 0,
    });
  } catch (error: any) {
    console.error('Error fetching partner status:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch status' });
  }
});

/**
 * POST /api/delivery-assignments/partner/status
 * Update partner's availability status
 */
router.post('/partner/status', authenticateToken, async (req, res) => {
  try {
    const { status, isOnline } = req.body;

    // Check authorization
    if (req.user?.role !== 'delivery') {
      return res.status(403).json({ error: 'Only delivery partners can update status' });
    }

    if (status && !['available', 'busy', 'offline'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be available, busy, or offline' });
    }

    const updates: any = {
      updatedAt: new Date(),
      lastSeen: new Date(),
    };

    if (status) {
      updates.status = status;
    }

    if (typeof isOnline === 'boolean') {
      updates.isOnline = isOnline;
    }

    await db.collection('delivery_partners').doc(req.user.uid).update(updates);

    res.json({
      success: true,
      message: 'Status updated',
    });
  } catch (error: any) {
    console.error('Error updating partner status:', error);
    res.status(500).json({ error: error.message || 'Failed to update status' });
  }
});

/**
 * GET /api/delivery-assignments/nearby-partners
 * Get available partners near a location (wholesaler/admin only)
 */
router.get('/nearby-partners', authenticateToken, async (req, res) => {
  try {
    // Check authorization
    if (req.user?.role !== 'wholesaler' && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only wholesaler or admin can view nearby partners' });
    }

    const { latitude, longitude, radius } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);
    const radiusKm = radius ? parseFloat(radius as string) : 10;

    const partners = await geospatialService.findNearbyPartners(
      { latitude: lat, longitude: lon },
      radiusKm,
      { status: 'available', requireAvailableCapacity: true }
    );

    res.json({
      success: true,
      partners,
      count: partners.length,
    });
  } catch (error: any) {
    console.error('Error fetching nearby partners:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch nearby partners' });
  }
});

/**
 * GET /api/delivery-assignments/timer/stats
 * Get SLA timer statistics (admin only)
 */
router.get('/timer/stats', authenticateToken, async (req, res) => {
  try {
    // Check authorization
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const stats = slaTimerService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error('Error fetching timer stats:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

export default router;
