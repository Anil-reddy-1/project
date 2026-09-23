/**
 * Ensure User Middleware
 * Auto-creates user record in database on first authentication
 * Attaches database user ID to req.user.dbId
 */

const pool = require('../config/db');
const logger = require('../utils/logger');

/**
 * Ensures authenticated user exists in database
 * Creates user record if it doesn't exist
 * Attaches database UUID to req.user.dbId
 * Should be used after authenticate middleware
 * 
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function ensureUser(req, res, next) {
  try {
    // Skip if no authenticated user
    if (!req.user || !req.user.uid) {
      return next();
    }

    const { uid, email, name, picture, role } = req.user;

    // Normalize role to match database constraints
    // Allowed roles: 'admin', 'buyer', 'seller', 'delivery'
    let normalizedRole = role || 'buyer';
    
    // Map Firebase roles to database roles
    const roleMapping = {
      'delivery_partner': 'delivery',
      'deliverypartner': 'delivery',
      'delivery-partner': 'delivery'
    };
    
    // Apply role mapping
    const mappedRole = roleMapping[normalizedRole.toLowerCase()];
    if (mappedRole) {
      normalizedRole = mappedRole;
    }
    
    // Validate against allowed roles
    const allowedRoles = ['admin', 'buyer', 'seller', 'delivery'];
    if (!allowedRoles.includes(normalizedRole.toLowerCase())) {
      logger.warn(`Invalid role '${normalizedRole}' for user ${uid}, defaulting to 'buyer'`);
      normalizedRole = 'buyer';
    }

    // Upsert user into database and get the database UUID
    const query = `
      INSERT INTO users (firebase_uid, email, name, avatar_url, role)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (firebase_uid) 
      DO UPDATE SET 
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        avatar_url = EXCLUDED.avatar_url,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id, firebase_uid, email, name, role;
    `;

    const result = await pool.query(query, [
      uid,
      email || null,
      name || null,
      picture || null,
      normalizedRole
    ]);

    // Attach database UUID to req.user
    if (result.rows.length > 0) {
      req.user.dbId = result.rows[0].id;
      req.user.dbRole = result.rows[0].role;
    }

    return next();
  } catch (error) {
    // Log error but don't block request
    logger.error('Failed to ensure user exists in database:', {
      error: error.message,
      userId: req.user?.uid,
      code: error.code,
      stack: error.stack
    });
    
    // Return error to prevent operations with missing user
    return res.status(500).json({
      success: false,
      message: 'Failed to initialize user session',
      error: error.message
    });
  }
}

module.exports = { ensureUser };
