const userService = require('../services/userService');
const response = require('../utils/response');

/**
 * User HTTP Controller Handlers
 * Receives Express requests, calls user service, and formats standardized HTTP responses.
 */

/**
 * GET /api/users
 * Retrieve paginated list of users with optional role, search, or status filters
 */
async function getAllUsers(req, res, next) {
  try {
    const { page, limit, role, search, isActive } = req.query;
    const result = await userService.getUsers({ page, limit, role, search, isActive });

    return response.paginated(res, {
      data: result.users,
      page: result.page,
      limit: result.limit,
      total: result.total,
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/users/me
 * Get current authenticated user profile
 */
async function getMe(req, res, next) {
  try {
    const userProfile = await userService.getOrCreateFirebaseUser(req.user);
    return response.success(res, {
      data: userProfile,
      message: 'Authenticated user profile retrieved successfully',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * GET /api/users/:id
 * Retrieve single user by ID or Firebase UID
 */
async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    return response.success(res, {
      data: user,
      message: 'User profile retrieved successfully',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/users/sync
 * Idempotently sync authenticated Firebase user into Postgres database
 */
async function syncUser(req, res, next) {
  try {
    const user = await userService.getOrCreateFirebaseUser(req.user);
    return response.success(res, {
      data: user,
      message: 'User synchronized successfully',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * POST /api/users
 * Register a new user (Admin or system registration)
 */
async function createUser(req, res, next) {
  try {
    const newUser = await userService.registerUser(req.body);
    return response.created(res, {
      data: newUser,
      message: 'User created successfully',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * PUT /api/users/:id
 * Update user profile details
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUserProfile(id, req.body, req.user);

    return response.success(res, {
      data: updatedUser,
      message: 'User profile updated successfully',
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * DELETE /api/users/:id
 * Delete user profile
 */
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    await userService.deleteUserProfile(id, req.user);

    return response.success(res, {
      data: null,
      message: 'User deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllUsers,
  getUser,
  getMe,
  syncUser,
  createUser,
  updateUser,
  deleteUser,
};
