const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { authenticate, requireRole } = require('../middleware/auth');
const { ensureUser } = require('../middleware/ensureUser');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * User Routes
 * Base path: /api/v1/users
 */

// GET /users - Get all users
router.get(
  '/',
  authenticate,
  ensureUser,
  requireRole('admin'),
  validateQuery(querySchemas.userFilter),
  userController.getAllUsers
);

// GET /users/:id - Get user by ID
router.get(
  '/:id',
  authenticate,
  ensureUser,
  requireRole('admin'),
  userController.getUserById
);

// POST /users - Create new user
router.post(
  '/',
  authenticate,
  ensureUser,
  requireRole('admin'),
  validateRequest(schemas.createUser),
  userController.createUser
);

// PUT /users/:id - Update user
router.put(
  '/:id',
  authenticate,
  ensureUser,
  requireRole('admin'),
  validateRequest(schemas.updateUser),
  userController.updateUser
);

// DELETE /users/:id - Delete user
router.delete(
  '/:id',
  authenticate,
  ensureUser,
  requireRole('admin'),
  userController.deleteUser
);

module.exports = router;
