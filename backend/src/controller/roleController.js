const { success } = require('../utils/response');
const { rolePermissions } = require('../middleware/rolePermission');

/**
 * Role Management Controller
 */

async function getAllRoles(req, res, next) {
  try {
    // Return predefined roles with their permissions
    const roles = [
      {
        id: 'role_admin',
        name: 'admin',
        displayName: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: Object.entries(rolePermissions.admin).flatMap(([resource, actions]) =>
          actions.map(action => `${resource}.${action}`)
        ),
        userCount: 0, // Would need to query database for actual count
        createdAt: new Date().toISOString(),
      },
      {
        id: 'role_buyer',
        name: 'buyer',
        displayName: 'Buyer',
        description: 'Can create orders and view stock/pricing',
        permissions: Object.entries(rolePermissions.buyer).flatMap(([resource, actions]) =>
          actions.map(action => `${resource}.${action}`)
        ),
        userCount: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'role_delivery',
        name: 'delivery',
        displayName: 'Delivery Partner',
        description: 'Can manage deliveries and view orders',
        permissions: Object.entries(rolePermissions.delivery).flatMap(([resource, actions]) =>
          actions.map(action => `${resource}.${action}`)
        ),
        userCount: 0,
        createdAt: new Date().toISOString(),
      },
    ];

    return success(res, {
      data: {
        roles,
      },
      message: 'Roles retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getRoleById(req, res, next) {
  try {
    const { id } = req.params;

    // Map role IDs to roles
    const roleMap = {
      role_admin: 'admin',
      role_buyer: 'buyer',
      role_delivery: 'delivery',
    };

    const roleName = roleMap[id];
    if (!roleName) {
      throw new NotFoundError('Role not found', 'Role');
    }

    const rolePerms = rolePermissions[roleName];
    const permissions = Object.entries(rolePerms).flatMap(([resource, actions]) =>
      actions.map(action => `${resource}.${action}`)
    );

    const displayNames = {
      admin: 'Administrator',
      buyer: 'Buyer',
      delivery: 'Delivery Partner',
    };

    const descriptions = {
      admin: 'Full system access with all permissions',
      buyer: 'Can create orders and view stock/pricing',
      delivery: 'Can manage deliveries and view orders',
    };

    return success(res, {
      data: {
        id,
        name: roleName,
        displayName: displayNames[roleName],
        description: descriptions[roleName],
        permissions,
        userCount: 0,
        createdAt: new Date().toISOString(),
      },
      message: 'Role retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllRoles,
  getRoleById,
};
