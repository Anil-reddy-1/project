import { db } from '../config/firebase';
import { adminDb } from '../config/firebase';
import { deliveryAssignmentService } from './delivery-assignment.service';

interface TimerRecord {
  assignmentId: string;
  expiresAt: Date;
  orderId: string;
  partnerId: string;
  createdAt: Date;
}

export class SLATimerService {
  private timers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start SLA timer for an assignment
   */
  async startTimer(assignmentId: string, durationSeconds: number): Promise<void> {
    try {
      // Cancel existing timer if any
      this.cancelTimer(assignmentId);

      const expiresAt = new Date(Date.now() + durationSeconds * 1000);

      console.log(
        `Starting SLA timer for assignment ${assignmentId} - expires in ${durationSeconds} seconds`
      );

      // Set timeout
      const timer = setTimeout(async () => {
        console.log(`SLA timer expired for assignment ${assignmentId}`);
        await this.handleTimeout(assignmentId);
      }, durationSeconds * 1000);

      // Store timer reference
      this.timers.set(assignmentId, timer);

      // Store timer record in database for persistence
      const db = adminDb();
      await db
        .collection('sla_timers')
        .doc(assignmentId)
        .set({
          assignmentId,
          expiresAt,
          createdAt: new Date(),
        });
    } catch (error) {
      console.error(`Error starting timer for ${assignmentId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel a timer (when partner responds)
   */
  cancelTimer(assignmentId: string): void {
    const timer = this.timers.get(assignmentId);

    if (timer) {
      clearTimeout(timer);
      this.timers.delete(assignmentId);
      console.log(`Cancelled SLA timer for assignment ${assignmentId}`);
    }

    // Remove from database
    const db = adminDb();
    db.collection('sla_timers')
      .doc(assignmentId)
      .delete()
      .catch((error) => {
        console.error(`Error deleting timer record ${assignmentId}:`, error);
      });
  }

  /**
   * Handle timeout
   */
  private async handleTimeout(assignmentId: string): Promise<void> {
    try {
      // Remove from active timers
      this.timers.delete(assignmentId);

      // Check if this is a batch assignment
      const db = adminDb();
      const assignmentDoc = await db.collection('delivery_assignments').doc(assignmentId).get();
      
      if (assignmentDoc.exists) {
        const assignmentData = assignmentDoc.data();
        
        if (assignmentData?.type === 'batch') {
          // Handle batch assignment timeout
          const { batchAssignmentService } = await import('./batch-assignment.service');
          await batchAssignmentService.handleBatchTimeout(assignmentId);
        } else {
          // Handle single assignment timeout
          await deliveryAssignmentService.handleSLATimeout(assignmentId);
        }
      }

      // Clean up timer record
      await db.collection('sla_timers').doc(assignmentId).delete();
    } catch (error) {
      console.error(`Error handling timeout for ${assignmentId}:`, error);
    }
  }

  /**
   * Process expired assignments (for recovery/scheduled checks)
   * This handles cases where timers might have been lost due to server restart
   */
  async processExpiredAssignments(): Promise<void> {
    try {
      const now = new Date();
      const db = adminDb();

      // Get all expired timers from database
      const expiredTimersSnapshot = await db
        .collection('sla_timers')
        .where('expiresAt', '<=', now)
        .get();

      console.log(`Processing ${expiredTimersSnapshot.size} expired timers`);

      const promises = expiredTimersSnapshot.docs.map(async (doc) => {
        const assignmentId = doc.id;
        await this.handleTimeout(assignmentId);
      });

      await Promise.all(promises);

      // Also check assignments directly (belt and suspenders)
      await deliveryAssignmentService.processExpiredAssignments();
    } catch (error) {
      console.error('Error processing expired assignments:', error);
    }
  }

  /**
   * Restore timers from database (on server startup)
   */
  async restoreTimers(): Promise<void> {
    try {
      const now = new Date();
      const db = adminDb();

      // Get all active timers
      const timersSnapshot = await db.collection('sla_timers').get();

      console.log(`Restoring ${timersSnapshot.size} timers from database`);

      for (const doc of timersSnapshot.docs) {
        const timerData = doc.data() as TimerRecord;
        const assignmentId = doc.id;
        const expiresAt = timerData.expiresAt;

        // Calculate remaining time
        const remainingMs = expiresAt.getTime() - now.getTime();

        if (remainingMs <= 0) {
          // Already expired, process immediately
          await this.handleTimeout(assignmentId);
        } else {
          // Restart timer with remaining time
          const remainingSeconds = Math.ceil(remainingMs / 1000);
          await this.startTimer(assignmentId, remainingSeconds);
        }
      }

      console.log('Timer restoration complete');
    } catch (error) {
      console.error('Error restoring timers:', error);
    }
  }

  /**
   * Get timer info for an assignment
   */
  async getTimerInfo(assignmentId: string): Promise<{
    exists: boolean;
    expiresAt?: Date;
    remainingSeconds?: number;
  }> {
    const db = adminDb();
    const timerDoc = await db.collection('sla_timers').doc(assignmentId).get();

    if (!timerDoc.exists) {
      return { exists: false };
    }

    const timerData = timerDoc.data() as TimerRecord;
    const expiresAt = timerData.expiresAt;
    const now = new Date();
    const remainingMs = expiresAt.getTime() - now.getTime();
    const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

    return {
      exists: true,
      expiresAt,
      remainingSeconds,
    };
  }

  /**
   * Clean up all timers (for shutdown)
   */
  cleanup(): void {
    console.log(`Cleaning up ${this.timers.size} active timers`);

    for (const [assignmentId, timer] of this.timers.entries()) {
      clearTimeout(timer);
    }

    this.timers.clear();
  }

  /**
   * Get statistics about active timers
   */
  getStats(): {
    activeTimers: number;
    timerIds: string[];
  } {
    return {
      activeTimers: this.timers.size,
      timerIds: Array.from(this.timers.keys()),
    };
  }
}

export const slaTimerService = new SLATimerService();

// Restore timers on service initialization (delayed to allow Firebase to init)
setTimeout(() => {
  slaTimerService.restoreTimers().catch((error) => {
    console.error('Failed to restore timers on startup:', error);
  });
}, 1000); // Wait 1 second for Firebase to initialize

// Clean up timers on process exit
process.on('SIGINT', () => {
  console.log('Received SIGINT, cleaning up timers...');
  slaTimerService.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, cleaning up timers...');
  slaTimerService.cleanup();
  process.exit(0);
});
