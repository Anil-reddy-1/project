const { success, created, paginated, noContent } = require('../utils/response');
const { NotFoundError } = require('../utils/error');
const userModel = require('../models/userModel');
const logger = require('../utils/logger');

/**
 * User Management Controller
 */

async function getAllUsers(req, res, next) {
  try {
    const { page = 1, limit = 20, search, role, status } = req.validatedQuery;

    const isActive = status === 'active' ? true : status === 'inactive' ? false : undefined;

    const { users, total } = await userModel.findAllUsers({
      page,
      limit,
      search,
      role,
      isActive,
    });

    return paginated(res, {
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: u.isActive ? 'active' : 'inactive',
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      page,
      limit,
      total,
      message: 'Users retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const user = await userModel.findUserById(id);
    if (!user) {
      throw new NotFoundError('User not found', 'User');
    }

    return success(res, {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, phone, role, status } = req.validatedBody;

    // Check if user already exists
    const existing = await userModel.findUserByEmail(email);
    if (existing) {
      throw new Error('User with this email already exists');
    }

    // For now, create without Firebase UID (would be created during Firebase registration)
    const user = await userModel.createUser({
      firebaseUid: `temp_${Date.now()}`, // Temporary UID
      email,
      name,
      phone,
      role,
    });

    logger.info(`User created: ${user.id}`);

    return created(res, {
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        status: user.isActive ? 'active' : 'inactive',
        createdAt: user.createdAt,
      },
      message: 'User created successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await userModel.findUserById(id);
    if (!user) {
      throw new NotFoundError('User not found', 'User');
    }

    const updateFields = {};
    if (req.validatedBody.name !== undefined) updateFields.name = req.validatedBody.name;
    if (req.validatedBody.email !== undefined) updateFields.email = req.validatedBody.email;
    if (req.validatedBody.phone !== undefined) updateFields.phone = req.validatedBody.phone;
    if (req.validatedBody.role !== undefined) updateFields.role = req.validatedBody.role;
    if (req.validatedBody.status !== undefined) updateFields.isActive = req.validatedBody.status === 'active';

    const updatedUser = await userModel.updateUser(id, updateFields);

    logger.info(`User updated: ${id}`);

    return success(res, {
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.isActive ? 'active' : 'inactive',
        updatedAt: updatedUser.updatedAt,
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    const user = await userModel.findUserById(id);
    if (!user) {
      throw new NotFoundError('User not found', 'User');
    }

    await userModel.softDeleteUser(id);

    logger.info(`User deleted: ${id}`);

    return success(res, {
      message: 'User deleted successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
