const userModel = require('../models/userModel');
const { NotFoundError, ConflictError, BadRequestError, ForbiddenError } = require('../utils/error');

/**
 * User Business Logic Service
 * Handles user business rules, role authorization limits, and data validation.
 */

/**
 * Get paginated list of users
 */
async function getUsers({ page = 1, limit = 10, role, search, isActive }) {
  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  let parsedIsActive = undefined;
  if (isActive === 'true' || isActive === true) parsedIsActive = true;
  if (isActive === 'false' || isActive === false) parsedIsActive = false;

  const { users, total } = await userModel.findAllUsers({
    page: parsedPage,
    limit: parsedLimit,
    role,
    search,
    isActive: parsedIsActive,
  });

  return {
    users,
    page: parsedPage,
    limit: parsedLimit,
    total,
  };
}

/**
 * Get user by Database ID or Firebase UID
 */
async function getUserById(id) {
  if (!id) {
    throw new BadRequestError('User ID is required.');
  }

  // Check if query is UUID or Firebase UID
  let user = await userModel.findUserById(id).catch(() => null);
  if (!user) {
    user = await userModel.findUserByFirebaseUid(id);
  }

  if (!user) {
    throw new NotFoundError(`User with ID '${id}' not found`, 'User');
  }

  return user;
}

/**
 * Get or automatically create authenticated user profile from Firebase token
 */
async function getOrCreateFirebaseUser(reqUser) {
  if (!reqUser || !reqUser.uid) {
    throw new BadRequestError('Invalid authenticated user data.');
  }

  let user = await userModel.findUserByFirebaseUid(reqUser.uid);

  if (!user) {
    // Upsert profile from Firebase
    user = await userModel.upsertFirebaseUser({
      firebaseUid: reqUser.uid,
      email: reqUser.email || `${reqUser.uid}@gangajamuna.user`,
      name: reqUser.name || 'Ganga Jamuna User',
      avatarUrl: reqUser.picture || null,
      role: reqUser.role || 'student',
    });
  }

  return user;
}

/**
 * Register a new user in database
 */
async function registerUser(userData) {
  const { firebaseUid, email, name, phone, role, department, avatarUrl } = userData;

  if (!firebaseUid || !email || !name) {
    throw new BadRequestError('firebaseUid, email, and name are required fields.');
  }

  // Check existing email
  const existingEmail = await userModel.findUserByEmail(email);
  if (existingEmail) {
    throw new ConflictError(`User with email '${email}' already exists.`);
  }

  // Check existing firebase_uid
  const existingUid = await userModel.findUserByFirebaseUid(firebaseUid);
  if (existingUid) {
    throw new ConflictError(`User with Firebase UID '${firebaseUid}' already exists.`);
  }

  return userModel.createUser({
    firebaseUid,
    email,
    name,
    phone,
    role: role || 'student',
    department,
    avatarUrl,
  });
}

/**
 * Update user profile with security & permission checks
 */
async function updateUserProfile(id, updateData, currentUser) {
  const targetUser = await getUserById(id);

  const isSelf = currentUser && (currentUser.uid === targetUser.firebaseUid || currentUser.uid === targetUser.id);
  const isAdmin = currentUser && currentUser.role === 'admin';

  if (!isSelf && !isAdmin) {
    throw new ForbiddenError('You are not authorized to update this user profile.');
  }

  // Restrict sensitive field edits for non-admins
  const sanitizedUpdates = { ...updateData };

  if (!isAdmin) {
    delete sanitizedUpdates.role;
    delete sanitizedUpdates.isActive;
    delete sanitizedUpdates.firebaseUid;
    delete sanitizedUpdates.email;
  }

  // Validate role if admin is attempting role update
  if (sanitizedUpdates.role) {
    const validRoles = ['student', 'faculty', 'admin'];
    if (!validRoles.includes(sanitizedUpdates.role.toLowerCase())) {
      throw new BadRequestError(`Invalid role. Allowed roles: ${validRoles.join(', ')}`);
    }
  }

  return userModel.updateUser(targetUser.id, sanitizedUpdates);
}

/**
 * Delete user profile
 */
async function deleteUserProfile(id, currentUser) {
  const targetUser = await getUserById(id);

  // Prevent self-deletion of primary admin
  if (currentUser && currentUser.uid === targetUser.firebaseUid && currentUser.role === 'admin') {
    throw new BadRequestError('Admin user cannot delete their own account via API.');
  }

  return userModel.deleteUser(targetUser.id);
}

module.exports = {
  getUsers,
  getUserById,
  getOrCreateFirebaseUser,
  registerUser,
  updateUserProfile,
  deleteUserProfile,
};
