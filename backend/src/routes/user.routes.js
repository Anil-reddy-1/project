const express = require('express');
const userController = require('../controller/userController');
const { authenticate, requireRole, requireSelfOrAdmin } = require('../middleware/auth');
const { validateCreateUser, validateUpdateUser, validateQueryUser } = require('../middleware/userValidation');

const router = express.Router();

/**
 * User API Routes
 * Base path: /api/users
 */

// Get current authenticated user profile
router.get('/me', authenticate, userController.getMe);

// Idempotent sync of authenticated Firebase user into Postgres database
router.post('/sync', authenticate, userController.syncUser);

// Get paginated list of users (Admin and Faculty access)
router.get('/', authenticate, requireRole('admin', 'faculty'), validateQueryUser, userController.getAllUsers);

// Get user by ID (Self or Admin access)
router.get('/:id', authenticate, requireSelfOrAdmin('id'), userController.getUser);

// Create user (Admin only)
router.post('/', authenticate, requireRole('admin'), validateCreateUser, userController.createUser);

// Update user profile by ID (Self or Admin access)
router.put('/:id', authenticate, requireSelfOrAdmin('id'), validateUpdateUser, userController.updateUser);

// Delete user by ID (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), userController.deleteUser);

module.exports = router;