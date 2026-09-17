const express = require('express');
const router = express.Router();
const authController = require('../controller/authController');
const { authenticate } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validateRequest');

/**
 * Auth Routes
 * Base path: /api/v1/auth
 */

// POST /auth/login - Login (handled by Firebase client SDK)
router.post('/login', validateRequest(schemas.login), authController.login);

// POST /auth/logout - Logout
router.post('/logout', authenticate, authController.logout);

// POST /auth/refresh - Refresh token (handled by Firebase client SDK)
router.post('/refresh', validateRequest(schemas.refreshToken), authController.refreshToken);

// GET /auth/me - Get current user profile
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
