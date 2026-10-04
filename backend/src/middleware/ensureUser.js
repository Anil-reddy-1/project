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
    // Skip in test environment - test users are already created
    if (process.env.NODE_ENV === 'test') {
      return next();
    }
    
    // Skip if no authenticated user
    if (!req.user || !req.user.uid) {
      return next();
    }

    const { uid, email, name, picture, role } = req.user;

    // Normalize role to match database constraints
    // Allowed roles: 'admin', 'buyer', 'seller', 'delivery'
    let normalizedRole = role || 'buyer';
    
    // Map Firebase custom claim roles → valid DB roles
    const roleMapping = {
      // Delivery aliases
      'delivery_partner': 'delivery',
      'deliverypartner': 'delivery',
      'delivery-partner': 'delivery',
      // Buyer aliases — legacy Firebase claims or older setups
      'retailer': 'buyer',
      'wholesaler': 'buyer',
      'customer': 'buyer',
      'user': 'buyer',
    };
    
    // Apply role mapping
    const mappedRole = roleMapping[normalizedRole.toLowerCase()];
    if (mappedRole) {
      normalizedRole = mappedRole;
    }
    
    // Validate against allowed roles; default anything unknown to buyer
    const allowedRoles = ['admin', 'buyer', 'delivery', 'supervisor'];
    if (!allowedRoles.includes(normalizedRole.toLowerCase())) {
      logger.warn(`Invalid role '${normalizedRole}' for user ${uid}, defaulting to 'buyer'`);
      normalizedRole = 'buyer';
    }

    // Upsert user into database and get the database UUID.
    // We intentionally DO NOT update the role on conflict — role changes are
    // made by admins via the User Management UI, not overwritten on every login.
    // HOWEVER: if the stored role is somehow invalid (e.g. old data), heal it.
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
      name || (email ? email.split('@')[0] : 'Unknown User'),
      picture || null,
      normalizedRole
    ]);

    // Attach database UUID and synchronized role to req.user
    if (result.rows.length > 0) {
      req.user.dbId = result.rows[0].id;
      req.user.dbRole = result.rows[0].role;
      req.user.role = result.rows[0].role;
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
