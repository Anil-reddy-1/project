const { created } = require('../utils/response');
const { ConflictError, BadRequestError } = require('../utils/error');
const userModel = require('../models/userModel');
const { getAuth } = require('../config/firebase');
const logger = require('../utils/logger');

/**
 * Public Signup Controller
 * Allows users to register as buyers without admin intervention
 */

async function signupBuyer(req, res, next) {
  try {
    const { email, password, name, phone } = req.validatedBody;

    // Check if user already exists in database
    const existingUser = await userModel.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Create user in Firebase Authentication
    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      throw new BadRequestError(
        'Firebase authentication is not configured. Please contact administrator.',
        'FIREBASE_NOT_CONFIGURED'
      );
    }

    let firebaseUser;
    try {
      firebaseUser = await firebaseAuth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: false,
      });

      logger.info(`Firebase user created: ${firebaseUser.uid}`);
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-exists') {
        throw new ConflictError('This email is already registered in the system');
      }
      if (firebaseError.code === 'auth/invalid-password') {
        throw new BadRequestError('Password must be at least 6 characters long');
      }
      logger.error('Firebase user creation failed:', firebaseError);
      throw new BadRequestError('Failed to create user account. Please try again.');
    }

    // Create user in database with buyer role
    const user = await userModel.createUser({
      firebaseUid: firebaseUser.uid,
      email,
      name,
      phone: phone || null,
      role: 'buyer', // Always set role as buyer for public signup
    });

    logger.info(`Buyer user created in database: ${user.id}`);

    // Generate custom token for immediate login (optional)
    let customToken = null;
    try {
      customToken = await firebaseAuth.createCustomToken(firebaseUser.uid);
    } catch (tokenError) {
      logger.warn('Failed to create custom token:', tokenError);
      // Continue without token - user can login normally
    }

    return created(res, {
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
        },
        customToken, // Can be used for immediate login on frontend
        message: 'Account created successfully. You can now login.',
      },
      message: 'Buyer account created successfully',
    });
  } catch (error) {
    // If database creation fails but Firebase user was created, clean up
    if (error.firebaseUid) {
      try {
        const firebaseAuth = getAuth();
        await firebaseAuth.deleteUser(error.firebaseUid);
        logger.info(`Cleaned up Firebase user after database error: ${error.firebaseUid}`);
      } catch (cleanupError) {
        logger.error('Failed to cleanup Firebase user:', cleanupError);
      }
    }
    next(error);
  }
}

/**
 * Check if email is available
 */
async function checkEmailAvailability(req, res, next) {
  try {
    const { email } = req.query;

    if (!email) {
      throw new BadRequestError('Email parameter is required');
    }

    const existingUser = await userModel.findUserByEmail(email);
    const available = !existingUser;

    return res.json({
      success: true,
      data: {
        email,
        available,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  signupBuyer,
  checkEmailAvailability,
};
