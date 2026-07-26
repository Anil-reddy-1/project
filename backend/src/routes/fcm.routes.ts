import { Router } from 'express';
import { verifyFirebaseToken as authenticateToken } from '../middleware/auth';
import { fcmService } from '../services/fcm.service';

const router = Router();

/**
 * POST /api/fcm/register
 * Register FCM token for current user
 */
router.post('/register', authenticateToken, async (req, res) => {
  try {
    const { token, deviceInfo } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    await fcmService.registerToken(req.user!.uid, token, deviceInfo);

    res.json({
      success: true,
      message: 'FCM token registered successfully',
    });
  } catch (error: any) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({ error: error.message || 'Failed to register FCM token' });
  }
});

/**
 * POST /api/fcm/unregister
 * Unregister FCM token
 */
router.post('/unregister', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    await fcmService.unregisterToken(token);

    res.json({
      success: true,
      message: 'FCM token unregistered successfully',
    });
  } catch (error: any) {
    console.error('Error unregistering FCM token:', error);
    res.status(500).json({ error: error.message || 'Failed to unregister FCM token' });
  }
});

/**
 * POST /api/fcm/subscribe
 * Subscribe to topic
 */
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { token, topic } = req.body;

    if (!token || !topic) {
      return res.status(400).json({ error: 'Token and topic are required' });
    }

    await fcmService.subscribeToTopic(token, topic);

    res.json({
      success: true,
      message: `Subscribed to topic: ${topic}`,
    });
  } catch (error: any) {
    console.error('Error subscribing to topic:', error);
    res.status(500).json({ error: error.message || 'Failed to subscribe to topic' });
  }
});

/**
 * POST /api/fcm/unsubscribe
 * Unsubscribe from topic
 */
router.post('/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { token, topic } = req.body;

    if (!token || !topic) {
      return res.status(400).json({ error: 'Token and topic are required' });
    }

    await fcmService.unsubscribeFromTopic(token, topic);

    res.json({
      success: true,
      message: `Unsubscribed from topic: ${topic}`,
    });
  } catch (error: any) {
    console.error('Error unsubscribing from topic:', error);
    res.status(500).json({ error: error.message || 'Failed to unsubscribe from topic' });
  }
});

/**
 * POST /api/fcm/test
 * Send test notification (development only)
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Test notifications not allowed in production' });
    }

    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const success = await fcmService.sendNotification({
      token,
      notification: {
        title: title || '🧪 Test Notification',
        body: body || 'This is a test notification from the server',
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    });

    res.json({
      success,
      message: success ? 'Test notification sent' : 'Failed to send notification',
    });
  } catch (error: any) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message || 'Failed to send test notification' });
  }
});

export default router;
