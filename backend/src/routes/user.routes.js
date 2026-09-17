const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rolePermission');
const { validateRequest, validateQuery, schemas, querySchemas } = require('../middleware/validateRequest');

/**
 * User Routes
 * Base path: /api/v1/users
 */

// GET /users - Get all users
router.get(
  '/',
  authenticate,
  requirePermission('users', 'view'),
  validateQuery(querySchemas.search),
  userController.getAllUsers
);

// GET /users/:id - Get user by ID
router.get(
  '/:id',
  authenticate,
  requirePermission('users', 'view'),
  userController.getUserById
);

// POST /users - Create new user
router.post(
  '/',
  authenticate,
  requirePermission('users', 'create'),
  validateRequest(schemas.createUser),
  userController.createUser
);

// PUT /users/:id - Update user
router.put(
  '/:id',
  authenticate,
  requirePermission('users', 'update'),
  validateRequest(schemas.updateUser),
  userController.updateUser
);

// DELETE /users/:id - Delete user
router.delete(
  '/:id',
  authenticate,
  requirePermission('users', 'delete'),
  userController.deleteUser
);

module.exports = router;
