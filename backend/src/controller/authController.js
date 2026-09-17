const { getAuth } = require('../config/firebase');
const { success, created } = require('../utils/response');
const { UnauthorizedError, BadRequestError } = require('../utils/error');
const userModel = require('../models/userModel');
const logger = require('../utils/logger');

/**
 * Auth Controller
 * Handles authentication operations
 */

async function login(req, res, next) {
  try {
    const { email, password } = req.validatedBody;

    // Note: Firebase Authentication is handled on the client side (frontend)
    // This endpoint is for documenting the flow, actual token validation happens in auth middleware
    
    throw new BadRequestError(
      'Login should be performed via Firebase Authentication on the client side. Use the token in Authorization header.',
      'FIREBASE_AUTH_REQUIRED'
    );
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('No active session to logout');
    }

    // In a real scenario, you might want to blacklist the token or track logout
    logger.info(`User logged out: ${req.user.uid}`);

    return success(res, {
      message: 'Logged out successfully',
      statusCode: 200,
    });
  } catch (error) {
    next(error);
  }
}

async function refreshToken(req, res, next) {
  try {
    // Token refresh should be handled by Firebase client SDK
    throw new BadRequestError(
      'Token refresh should be performed via Firebase Authentication on the client side.',
      'FIREBASE_AUTH_REQUIRED'
    );
  } catch (error) {
    next(error);
  }
}

/**
 * Get current user profile
 */
async function getCurrentUser(req, res, next) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('No active session');
    }

    // Try to get user from database
    let user = await userModel.findUserByFirebaseUid(req.user.uid);

    if (!user) {
      // Create user if doesn't exist (first login)
      user = await userModel.upsertFirebaseUser({
        firebaseUid: req.user.uid,
        email: req.user.email,
        name: req.user.name,
        avatarUrl: req.user.picture,
        role: 'buyer', // Default role
      });
    }

    return success(res, {
      data: {
        user: {
          id: user.id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          name: user.name,
          role: user.role,
          phone: user.phone,
          avatarUrl: user.avatarUrl,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
      message: 'User profile retrieved',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  login,
  logout,
  refreshToken,
  getCurrentUser,
};
