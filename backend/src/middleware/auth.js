/**
 * Authentication & Authorization Middlewares
 * Verifies Firebase ID Tokens, populates req.user, handles token revocation/expiration,
 * and provides Role-Based Access Control (RBAC) & Email Verification guards.
 */

const { getAuth } = require('../config/firebase');
const { UnauthorizedError, ForbiddenError } = require('../utils/error');
const logger = require('../utils/logger');

/**
 * Helper to extract Bearer token from request headers.
 * Handles edge cases:
 * - Missing Authorization header
 * - Array header values
 * - Non-string header values
 * - Incorrect prefix or missing token string
 * - Trims whitespace and handles multiple spaces
 * 
 * @param {import('express').Request} req
 * @returns {string|null} Extracted token or null
 */
function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return null;
  }

  // Handle case where header is an array of strings
  const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

  if (typeof headerValue !== 'string') {
    return null;
  }

  const parts = headerValue.trim().split(/\s+/);

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  const token = parts[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Standardize & sanitize Firebase decoded token into req.user
 * Ensures consistent schema across the application.
 * 
 * @param {import('firebase-admin/auth').DecodedIdToken} decodedToken
 * @returns {Object} Normalized user object attached to req.user
 */
function formatReqUser(decodedToken) {
  return {
    uid: decodedToken.uid,
    email: decodedToken.email || null,
    emailVerified: Boolean(decodedToken.email_verified),
    name: decodedToken.name || decodedToken.display_name || null,
    picture: decodedToken.picture || null,
    role: decodedToken.role || (decodedToken.customClaims && decodedToken.customClaims.role) || 'buyer',
    claims: { ...decodedToken },
    authTime: decodedToken.auth_time,
    tokenIssuedAt: decodedToken.iat,
    tokenExpiresAt: decodedToken.exp,
    firebase: decodedToken,
  };
}

/**
 * Primary Authentication Middleware:
 * Verifies Firebase ID Token and attaches req.user.
 * In test environment, accepts mock JWT tokens.
 * 
 * Edge cases handled:
 * - Missing or malformed Authorization headers
 * - Token expiration (auth/id-token-expired)
 * - Token revocation on logout/password change (auth/id-token-revoked) -> checkRevoked = true
 * - Disabled user account (auth/user-disabled)
 * - Deleted user account (auth/user-not-found)
 * - Invalid signature or malformed JWT (auth/invalid-id-token)
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authenticate(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      const rawHeader = req.headers.authorization || req.headers.Authorization;
      if (rawHeader) {
        throw new UnauthorizedError(
          'Malformed Authorization header. Format must be: Bearer <token>',
          'INVALID_AUTH_HEADER'
        );
      }
      throw new UnauthorizedError(
        'Authentication required. Missing Bearer token in Authorization header.',
        'MISSING_TOKEN'
      );
    }

    // In test environment, use mock token verification
    if (process.env.NODE_ENV === 'test') {
      try {
        const jwt = require('jsonwebtoken');
        const TEST_JWT_SECRET = 'test-secret-key-do-not-use-in-production';
        const decoded = jwt.verify(token, TEST_JWT_SECRET);
        
        req.user = {
          uid: decoded.uid,
          email: decoded.email,
          emailVerified: true, // Auto-verified in tests
          role: decoded.role || 'buyer',
          userId: decoded.userId,
          dbId: decoded.userId, // Set dbId for test compatibility
          dbRole: decoded.role || 'buyer',
          claims: decoded,
          authTime: Math.floor(Date.now() / 1000),
          tokenIssuedAt: decoded.iat,
          tokenExpiresAt: decoded.exp,
        };
        req.token = token;
        return next();
      } catch (jwtError) {
        throw new UnauthorizedError('Invalid test authentication token.', 'INVALID_TOKEN');
      }
    }

    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      throw new UnauthorizedError('Firebase authentication is not configured.', 'FIREBASE_NOT_CONFIGURED');
    }

    // Verify token with checkRevoked = true to catch tokens revoked via logout or admin action
    const decodedToken = await firebaseAuth.verifyIdToken(token, true);

    // Attach normalized user object and raw token to request
    req.user = formatReqUser(decodedToken);
    req.token = token;

    return next();
  } catch (error) {
    // Map Firebase specific auth errors to standard AppErrors
    if (error.code && typeof error.code === 'string' && error.code.startsWith('auth/')) {
      logger.warn(`Firebase token verification failed: ${error.code}`, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        errorCode: error.code,
      });

      switch (error.code) {
        case 'auth/id-token-expired':
          return next(new UnauthorizedError('Session expired. Please log in again.', 'TOKEN_EXPIRED'));
        case 'auth/id-token-revoked':
          return next(new UnauthorizedError('Session revoked. Please log in again.', 'TOKEN_REVOKED'));
        case 'auth/user-disabled':
          return next(new ForbiddenError('User account has been disabled.', 'USER_DISABLED'));
        case 'auth/user-not-found':
          return next(new UnauthorizedError('User account not found.', 'USER_NOT_FOUND'));
        case 'auth/invalid-id-token':
        case 'auth/argument-error':
        default:
          return next(new UnauthorizedError('Invalid authentication token.', 'INVALID_TOKEN'));
      }
    }

    return next(error);
  }
}

/**
 * Optional Authentication Middleware:
 * Attaches req.user if a valid token is supplied; sets req.user = null if missing or invalid token.
 * Does not block request execution.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function optionalAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);

    if (!token) {
      req.user = null;
      req.token = null;
      return next();
    }

    const firebaseAuth = getAuth();
    if (!firebaseAuth) {
      req.user = null;
      req.token = null;
      return next();
    }

    const decodedToken = await firebaseAuth.verifyIdToken(token, true);
    req.user = formatReqUser(decodedToken);
    req.token = token;
    return next();
  } catch (error) {
    logger.debug('Optional auth token invalid, proceeding as unauthenticated guest:', { message: error.message });
    req.user = null;
    req.token = null;
    return next();
  }
}

/**
 * Email Verification Middleware Guard:
 * Rejects requests if authenticated user has not verified their email address.
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function requireEmailVerified(req, res, next) {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.', 'UNAUTHORIZED'));
  }

  if (!req.user.emailVerified) {
    return next(
      new ForbiddenError('Email verification required. Please verify your email address.', 'EMAIL_NOT_VERIFIED')
    );
  }

  return next();
}

/**
 * Role-Based Access Control (RBAC) Guard:
 * Restricts access to users with authorized role(s).
 * 
 * @param {...string|string[]} allowedRoles - Allowed role names (e.g. 'admin', 'faculty', 'student')
 * @returns {import('express').RequestHandler} Express middleware
 */
function requireRole(...allowedRoles) {
  const rolesList = allowedRoles.flat().map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.', 'UNAUTHORIZED'));
    }

    const rawRole = (req.user.dbRole || req.user.role || 'buyer').toString().toLowerCase();
    
    // Normalize role aliases
    const roleAliases = {
      'delivery_partner': 'delivery',
      'deliverypartner': 'delivery',
      'delivery-partner': 'delivery',
      'customer': 'buyer',
      'user': 'buyer',
    };
    const effectiveRole = roleAliases[rawRole] || rawRole;

    const isAllowed =
      rolesList.includes(rawRole) ||
      rolesList.includes(effectiveRole) ||
      rolesList.includes('*') ||
      (rolesList.includes('buyer') && ['buyer', 'customer', 'user'].includes(effectiveRole));

    if (!isAllowed) {
      logger.warn(`Forbidden access attempt: path=${req.path}, user=${req.user.uid}, role=${rawRole} (effective: ${effectiveRole}), required=[${rolesList.join(', ')}]`);
      return next(
        new ForbiddenError(
          `Forbidden. Requires one of the following roles: ${rolesList.join(', ')}`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    return next();
  };
}

/**
 * Resource Ownership Guard:
 * Ensures request parameter (e.g., req.params.id) matches req.user.uid OR user has 'admin' role.
 * 
 * @param {string} paramName - Name of req.params containing target user ID (default: 'id')
 * @returns {import('express').RequestHandler} Express middleware
 */
function requireSelfOrAdmin(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.', 'UNAUTHORIZED'));
    }

    const targetUid = req.params[paramName];
    const isSelf = Boolean(targetUid && targetUid === req.user.uid);
    const isAdmin = Boolean(req.user.role && String(req.user.role).toLowerCase() === 'admin');

    if (!isSelf && !isAdmin) {
      return next(
        new ForbiddenError(
          'Forbidden. You can only access or modify your own resources.',
          'RESOURCE_ACCESS_DENIED'
        )
      );
    }

    return next();
  };
}

module.exports = {
  authenticate,
  verifyIdToken: authenticate,
  optionalAuth,
  requireEmailVerified,
  requireRole,
  requireSelfOrAdmin,
  formatReqUser,
  extractBearerToken,
};
