const { ForbiddenError } = require('../utils/error');
const logger = require('../utils/logger');

/**
 * Role-Based Permission Matrix
 * Define what each role can do
 */
const rolePermissions = {
  admin: {
    users: ['view', 'create', 'update', 'delete'],
    staff: ['view', 'create', 'update', 'delete'],
    stock: ['view', 'create', 'update', 'delete', 'adjust'],
    pricing: ['view', 'update'],
    orders: ['view', 'create', 'update', 'delete'],
    deliveries: ['view', 'create', 'assign', 'update'],
    debts: ['view', 'create', 'update', 'record_payment'],
    reports: ['view', 'generate', 'export'],
    dashboard: ['view'],
  },
  buyer: {
    orders: ['view', 'create'],
    deliveries: ['view'],
    stock: ['view'],
    pricing: ['view'],
    dashboard: ['view'],
  },
  seller: {
    orders: ['view', 'create'],
    deliveries: ['view'],
    stock: ['view', 'create', 'update', 'adjust'],
    pricing: ['view'],
    dashboard: ['view'],
  },
  delivery: {
    deliveries: ['view', 'update'],
    orders: ['view'],
    dashboard: ['view'],
  },
};

/**
 * Check if user has permission for a resource action
 */
function hasPermission(role, resource, action) {
  const roleAliases = {
    'delivery_partner': 'delivery',
    'deliverypartner': 'delivery',
    'delivery-partner': 'delivery',
    'customer': 'buyer',
    'user': 'buyer',
  };
  const effectiveRole = roleAliases[role] || role;

  const permissions = rolePermissions[effectiveRole] || rolePermissions[role];
  if (!permissions) return false;

  const resourcePermissions = permissions[resource];
  if (!resourcePermissions) return false;

  return resourcePermissions.includes(action);
}

/**
 * Require specific permission middleware factory
 * @param {string} resource - Resource name (e.g., 'users', 'stock')
 * @param {string} action - Action name (e.g., 'view', 'create', 'delete')
 */
function requirePermission(resource, action) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userRole = (req.user.dbRole || req.user.role || 'buyer').toString().toLowerCase();

    if (!hasPermission(userRole, resource, action)) {
      logger.warn(`Permission denied: user=${req.user.uid}, role=${userRole}, resource=${resource}, action=${action}`);
      return next(
        new ForbiddenError(
          `You do not have permission to ${action} ${resource}`,
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    return next();
  };
}

/**
 * Require one of multiple permissions (OR logic)
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userRole = (req.user.dbRole || req.user.role || 'buyer').toString().toLowerCase();

    const hasAny = permissions.some(({ resource, action }) =>
      hasPermission(userRole, resource, action)
    );

    if (!hasAny) {
      logger.warn(`Permission denied: user=${req.user.uid}, role=${userRole}, required permissions=${JSON.stringify(permissions)}`);
      return next(
        new ForbiddenError(
          'You do not have permission to perform this action',
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    return next();
  };
}

/**
 * Require all permissions (AND logic)
 */
function requireAllPermissions(permissions) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }

    const userRole = req.user.role ? String(req.user.role).toLowerCase() : 'buyer';

    const hasAll = permissions.every(({ resource, action }) =>
      hasPermission(userRole, resource, action)
    );

    if (!hasAll) {
      logger.warn(`Permission denied: user=${req.user.uid}, role=${userRole}, required permissions=${JSON.stringify(permissions)}`);
      return next(
        new ForbiddenError(
          'You do not have sufficient permissions for this action',
          'INSUFFICIENT_PERMISSIONS'
        )
      );
    }

    return next();
  };
}

module.exports = {
  rolePermissions,
  hasPermission,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
};
