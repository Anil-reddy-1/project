/**
 * Payment Routes
 * Derived from: Phase 3 Implementation Plan §8.2.2
 * 
 * Handles payment-related endpoints:
 * - PhonePe callback (user redirect after payment)
 * - PhonePe webhook (async payment status updates)
 * - Payment retry
 * - Payment status check
 */

import { Router, type Request, type Response } from 'express';
import { verifyFirebaseToken } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';
import { paymentService } from '../services/payment.service';
import { orderService } from '../services/order.service';
import {
  sendPaymentSuccessNotification,
  sendPaymentFailureNotification,
} from '../services/notification.service';

const router = Router();

/**
 * POST /api/payments/phonepe/callback
 * 
 * PhonePe callback handler - called when user is redirected back from PhonePe
 * This is a public endpoint (no auth) as it's called by PhonePe redirect
 * 
 * Query params: merchantTransactionId, status (from PhonePe)
 */
router.get('/phonepe/callback', async (req: Request, res: Response) => {
  try {
    const { merchantTransactionId } = req.query;

    if (!merchantTransactionId || typeof merchantTransactionId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Missing merchant transaction ID',
      });
    }

    console.log('[Payment Callback] Processing:', merchantTransactionId);

    // Verify payment status with PhonePe
    const payment = await paymentService.verifyPhonePePayment(merchantTransactionId);

    // Fetch order
    const orderDoc = await orderService.getOrderById(
      payment.orderId,
      'system',
      'admin' // Admin role to bypass access control
    );

    // Update order payment status
    if (payment.status === 'paid') {
      await orderService.updateOrderPaymentStatus(payment.orderId, 'paid', 'system');

      // Send success notification
      await sendPaymentSuccessNotification({
        orderId: payment.orderId,
        orderNumber: orderDoc.orderNumber,
        retailerName: orderDoc.retailerSnapshot.name,
        retailerEmail: orderDoc.retailerSnapshot.email,
        amount: payment.amount,
        paymentMethod: payment.phonepePaymentInstrument?.type || 'PhonePe',
        transactionId: payment.phonepeTransactionId,
      });

      // Redirect to success page
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/retailer/payment/success?orderId=${payment.orderId}`
      );
    } else if (payment.status === 'failed') {
      await orderService.updateOrderPaymentStatus(payment.orderId, 'failed', 'system');

      // Send failure notification
      await sendPaymentFailureNotification({
        orderId: payment.orderId,
        orderNumber: orderDoc.orderNumber,
        retailerName: orderDoc.retailerSnapshot.name,
        retailerEmail: orderDoc.retailerSnapshot.email,
        amount: payment.amount,
        paymentMethod: 'PhonePe',
        errorMessage: payment.errorMessage,
      });

      // Redirect to failure page
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/retailer/payment/failure?paymentId=${payment.paymentId}`
      );
    } else {
      // Payment still pending
      return res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/retailer/payment/pending?orderId=${payment.orderId}`
      );
    }
  } catch (error) {
    console.error('[Payment Callback] Error:', error);
    return res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/retailer/payment/error`
    );
  }
});

/**
 * POST /api/payments/phonepe/webhook
 * 
 * PhonePe webhook handler - called asynchronously by PhonePe
 * This is a public endpoint (no auth) as it's called by PhonePe servers
 * 
 * Webhook signature is verified in the service layer
 */
router.post('/phonepe/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-verify'] as string;
    const payload = req.body;

    if (!signature) {
      console.error('[Payment Webhook] Missing X-VERIFY signature');
      return res.status(401).json({
        success: false,
        message: 'Missing signature',
      });
    }

    console.log('[Payment Webhook] Received webhook');

    // Process webhook (includes signature verification)
    await paymentService.handlePhonePeWebhook(payload, signature);

    // Extract order and payment info for notifications
    const merchantTransactionId = payload.data?.merchantTransactionId;
    if (merchantTransactionId) {
      const payment = await paymentService.getPaymentById(
        payload.data.paymentId || merchantTransactionId
      );

      if (payment) {
        const orderDoc = await orderService.getOrderById(
          payment.orderId,
          'system',
          'admin'
        );

        // Send appropriate notification based on payment status
        if (payment.status === 'paid') {
          await orderService.updateOrderPaymentStatus(payment.orderId, 'paid', 'system');

          await sendPaymentSuccessNotification({
            orderId: payment.orderId,
            orderNumber: orderDoc.orderNumber,
            retailerName: orderDoc.retailerSnapshot.name,
            retailerEmail: orderDoc.retailerSnapshot.email,
            amount: payment.amount,
            paymentMethod: payment.phonepePaymentInstrument?.type || 'PhonePe',
            transactionId: payment.phonepeTransactionId,
          });
        } else if (payment.status === 'failed') {
          await orderService.updateOrderPaymentStatus(payment.orderId, 'failed', 'system');

          await sendPaymentFailureNotification({
            orderId: payment.orderId,
            orderNumber: orderDoc.orderNumber,
            retailerName: orderDoc.retailerSnapshot.name,
            retailerEmail: orderDoc.retailerSnapshot.email,
            amount: payment.amount,
            paymentMethod: 'PhonePe',
            errorMessage: payment.errorMessage,
          });
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    console.error('[Payment Webhook] Error:', error);
    // Still return 200 to prevent PhonePe from retrying
    return res.status(200).json({
      success: false,
      message: 'Webhook processing failed',
    });
  }
});

/**
 * POST /api/payments/:paymentId/retry
 * 
 * Retry a failed payment
 * Role: retailer (must own the order)
 */
router.post(
  '/:paymentId/retry',
  verifyFirebaseToken,
  requireRole('retailer'),
  async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const userId = req.user!.uid;

      // Fetch payment to verify ownership
      const payment = await paymentService.getPaymentById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      // Fetch order to verify retailer owns it
      const order = await orderService.getOrderById(payment.orderId, userId, 'retailer');
      if (order.retailerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      // Retry payment
      const result = await paymentService.retryPayment(paymentId);

      return res.status(200).json({
        success: true,
        message: 'Payment retry initiated',
        data: {
          paymentId: result.payment.paymentId,
          redirectUrl: result.redirectUrl,
        },
      });
    } catch (error: any) {
      console.error('[Payment Retry] Error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to retry payment',
      });
    }
  }
);

/**
 * GET /api/payments/:paymentId/status
 * 
 * Check payment status
 * Role: retailer, wholesaler, admin
 */
router.get(
  '/:paymentId/status',
  verifyFirebaseToken,
  async (req: Request, res: Response) => {
    try {
      const { paymentId } = req.params;
      const userId = req.user!.uid;
      const userRole = req.user!.role;

      // Fetch payment
      const payment = await paymentService.getPaymentById(paymentId);
      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found',
        });
      }

      // Verify access
      if (userRole === 'retailer') {
        const order = await orderService.getOrderById(payment.orderId, userId, 'retailer');
        if (order.retailerId !== userId) {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized',
          });
        }
      }

      return res.status(200).json({
        success: true,
        data: {
          paymentId: payment.paymentId,
          status: payment.status,
          amount: payment.amount,
          method: payment.method,
          gateway: payment.gateway,
          createdAt: payment.createdAt,
          paidAt: payment.paidAt,
          failedAt: payment.failedAt,
          errorMessage: payment.errorMessage,
          retryCount: payment.retryCount,
        },
      });
    } catch (error: any) {
      console.error('[Payment Status] Error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to get payment status',
      });
    }
  }
);

export default router;
