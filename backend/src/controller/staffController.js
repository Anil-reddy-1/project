const { success, created, paginated, noContent } = require('../utils/response');
const { NotFoundError, ConflictError } = require('../utils/error');
const staffModel = require('../models/staffModel');
const logger = require('../utils/logger');

/**
 * Staff Management Controller
 */

async function getAllStaff(req, res, next) {
  try {
    const { page = 1, limit = 20, role, status, availability } = req.validatedQuery;

    const { staff, total } = await staffModel.findAllStaff({
      page,
      limit,
      role,
      status,
      availability,
    });

    return paginated(res, {
      data: staff.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        role: s.role,
        status: s.status,
        availability: s.availability,
        activeDeliveries: s.activeDeliveries,
        createdAt: s.createdAt,
      })),
      page,
      limit,
      total,
      message: 'Staff members retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getStaffById(req, res, next) {
  try {
    const { id } = req.params;

    const staff = await staffModel.findStaffById(id);
    if (!staff) {
      throw new NotFoundError('Staff member not found', 'Staff');
    }

    return success(res, {
      data: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        availability: staff.availability,
        activeDeliveries: staff.activeDeliveries,
        createdAt: staff.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function createStaff(req, res, next) {
  try {
    const { name, email, phone, role, status } = req.validatedBody;

    const staff = await staffModel.createStaff({
      name,
      email,
      phone,
      role,
      status,
    });

    logger.info(`Staff member created: ${staff.id}`);

    return created(res, {
      data: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        phone: staff.phone,
        role: staff.role,
        status: staff.status,
        availability: staff.availability,
        createdAt: staff.createdAt,
      },
      message: 'Staff member created successfully',
    });
  } catch (error) {
    if (error.message.includes('duplicate')) {
      return next(new ConflictError('Staff member with this email already exists'));
    }
    next(error);
  }
}

async function updateStaffAvailability(req, res, next) {
  try {
    const { id } = req.params;
    const { availability } = req.validatedBody;

    const staff = await staffModel.findStaffById(id);
    if (!staff) {
      throw new NotFoundError('Staff member not found', 'Staff');
    }

    const updated = await staffModel.updateStaffAvailability(id, availability);

    logger.info(`Staff availability updated: ${id} -> ${availability}`);

    return success(res, {
      data: {
        id: updated.id,
        name: updated.name,
        availability: updated.availability,
        updatedAt: updated.updatedAt,
      },
      message: 'Staff availability updated successfully',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaffAvailability,
};
