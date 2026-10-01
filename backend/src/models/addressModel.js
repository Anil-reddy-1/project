const pool = require('../config/db');

/**
 * Address Data Access Layer
 * User delivery address management
 */

/**
 * Create a new address for user
 * If this is the user's first address, automatically set as default
 */
async function createAddress(userId, addressData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      name,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      isDefault,
      latitude,
      longitude,
      imageUrl
    } = addressData;
    
    // Check if user has any existing addresses
    const countQuery = `
      SELECT COUNT(*) as count FROM user_addresses WHERE user_id = $1;
    `;
    const countResult = await client.query(countQuery, [userId]);
    const existingAddressCount = parseInt(countResult.rows[0].count, 10);
    
    // If this is the first address, force it to be default
    const shouldBeDefault = existingAddressCount === 0 ? true : (isDefault || false);
    
    // If setting as default, unset other defaults
    if (shouldBeDefault) {
      await client.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
        [userId]
      );
    }
    
    // Insert new address
    const insertQuery = `
      INSERT INTO user_addresses (
        user_id, name, phone, address_line1, address_line2,
        city, state, postal_code, is_default, latitude, longitude, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    
    const values = [
      userId,
      name,
      phone,
      addressLine1,
      addressLine2 || null,
      city,
      state,
      postalCode,
      shouldBeDefault,
      latitude || null,
      longitude || null,
      imageUrl || null
    ];
    
    const result = await client.query(insertQuery, values);
    
    await client.query('COMMIT');
    
    return mapAddressRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all addresses for a user
 */
async function getUserAddresses(userId) {
  const query = `
    SELECT *
    FROM user_addresses
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at DESC;
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows.map(mapAddressRow);
}

/**
 * Get a specific address by ID
 * Includes authorization check - only returns if address belongs to user
 */
async function getAddressById(addressId, userId) {
  const query = `
    SELECT *
    FROM user_addresses
    WHERE id = $1 AND user_id = $2;
  `;
  
  const result = await pool.query(query, [addressId, userId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapAddressRow(result.rows[0]);
}

/**
 * Get user's default address
 */
async function getDefaultAddress(userId) {
  const query = `
    SELECT *
    FROM user_addresses
    WHERE user_id = $1 AND is_default = TRUE
    LIMIT 1;
  `;
  
  const result = await pool.query(query, [userId]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  return mapAddressRow(result.rows[0]);
}

/**
 * Update an address
 * Authorization check included - only updates if address belongs to user
 */
async function updateAddress(addressId, userId, addressData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify address belongs to user
    const checkQuery = `
      SELECT * FROM user_addresses
      WHERE id = $1 AND user_id = $2;
    `;
    const checkResult = await client.query(checkQuery, [addressId, userId]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { notFound: true, message: 'Address not found' };
    }
    
    const {
      name,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      isDefault,
      latitude,
      longitude,
      imageUrl
    } = addressData;
    
    // If setting as default, unset other defaults
    if (isDefault === true) {
      await client.query(
        'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1 AND id != $2',
        [userId, addressId]
      );
    }
    
    // Update address
    const updateQuery = `
      UPDATE user_addresses
      SET
        name = COALESCE($3, name),
        phone = COALESCE($4, phone),
        address_line1 = COALESCE($5, address_line1),
        address_line2 = $6,
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        postal_code = COALESCE($9, postal_code),
        is_default = COALESCE($10, is_default),
        latitude = $11,
        longitude = $12,
        image_url = $13,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
    
    const values = [
      addressId,
      userId,
      name,
      phone,
      addressLine1,
      addressLine2 !== undefined ? addressLine2 : null,
      city,
      state,
      postalCode,
      isDefault,
      latitude !== undefined ? latitude : null,
      longitude !== undefined ? longitude : null,
      imageUrl !== undefined ? imageUrl : null
    ];
    
    const result = await client.query(updateQuery, values);
    
    await client.query('COMMIT');
    
    return mapAddressRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set an address as default
 * Unsets all other addresses for the user
 */
async function setDefaultAddress(addressId, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Verify address belongs to user
    const checkQuery = `
      SELECT * FROM user_addresses
      WHERE id = $1 AND user_id = $2;
    `;
    const checkResult = await client.query(checkQuery, [addressId, userId]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { notFound: true, message: 'Address not found' };
    }
    
    // Unset all other defaults
    await client.query(
      'UPDATE user_addresses SET is_default = FALSE WHERE user_id = $1',
      [userId]
    );
    
    // Set this address as default
    const updateQuery = `
      UPDATE user_addresses
      SET is_default = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *;
    `;
    
    const result = await client.query(updateQuery, [addressId, userId]);
    
    await client.query('COMMIT');
    
    return mapAddressRow(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete an address
 * Authorization check included - only deletes if address belongs to user
 * If deleting default address and other addresses exist, make the most recent one default
 */
async function deleteAddress(addressId, userId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the address to be deleted
    const getQuery = `
      SELECT * FROM user_addresses
      WHERE id = $1 AND user_id = $2;
    `;
    const getResult = await client.query(getQuery, [addressId, userId]);
    
    if (getResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { notFound: true, message: 'Address not found' };
    }
    
    const addressToDelete = getResult.rows[0];
    const wasDefault = addressToDelete.is_default;
    
    // Delete the address
    await client.query(
      'DELETE FROM user_addresses WHERE id = $1 AND user_id = $2',
      [addressId, userId]
    );
    
    // If we deleted the default address, set another one as default
    if (wasDefault) {
      const makeDefaultQuery = `
        UPDATE user_addresses
        SET is_default = TRUE
        WHERE user_id = $1
        AND id = (
          SELECT id FROM user_addresses
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        )
        RETURNING *;
      `;
      await client.query(makeDefaultQuery, [userId]);
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Address deleted successfully',
      deletedAddressId: addressId
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get address count for user
 */
async function getAddressCount(userId) {
  const query = `
    SELECT COUNT(*) as count
    FROM user_addresses
    WHERE user_id = $1;
  `;
  
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Validate address data
 * Returns validation errors if any
 */
function validateAddressData(addressData) {
  const errors = [];
  
  if (!addressData.name || addressData.name.trim().length === 0) {
    errors.push('Name is required');
  }
  
  if (!addressData.phone || addressData.phone.trim().length === 0) {
    errors.push('Phone number is required');
  } else if (!/^[0-9]{10}$/.test(addressData.phone.replace(/[\s\-()]/g, ''))) {
    errors.push('Phone number must be valid (10 digits)');
  }
  
  if (!addressData.addressLine1 || addressData.addressLine1.trim().length === 0) {
    errors.push('Address line 1 is required');
  }
  
  if (!addressData.city || addressData.city.trim().length === 0) {
    errors.push('City is required');
  }
  
  if (!addressData.state || addressData.state.trim().length === 0) {
    errors.push('State is required');
  }
  
  if (!addressData.postalCode || addressData.postalCode.trim().length === 0) {
    errors.push('Postal code is required');
  } else if (!/^[0-9]{6}$/.test(addressData.postalCode.trim())) {
    errors.push('Postal code must be 6 digits');
  }
  
  // Validate geolocation if provided
  if (addressData.latitude !== undefined || addressData.longitude !== undefined) {
    // Both must be provided together
    if (addressData.latitude === undefined || addressData.latitude === null || 
        addressData.longitude === undefined || addressData.longitude === null) {
      errors.push('Both latitude and longitude must be provided together');
    } else {
      const lat = parseFloat(addressData.latitude);
      const lon = parseFloat(addressData.longitude);
      
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push('Latitude must be a valid number between -90 and 90');
      }
      
      if (isNaN(lon) || lon < -180 || lon > 180) {
        errors.push('Longitude must be a valid number between -180 and 180');
      }
    }
  }
  
  // Validate image URL if provided
  if (addressData.imageUrl !== undefined && addressData.imageUrl !== null && 
      addressData.imageUrl.trim().length > 0) {
    const urlPattern = /^(https?:\/\/)/i;
    if (!urlPattern.test(addressData.imageUrl.trim())) {
      errors.push('Image URL must be a valid HTTP/HTTPS URL');
    }
  }
  
  return errors;
}

/**
 * Map database row to address object with camelCase naming
 */
function mapAddressRow(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    isDefault: row.is_default,
    latitude: row.latitude ? parseFloat(row.latitude) : null,
    longitude: row.longitude ? parseFloat(row.longitude) : null,
    imageUrl: row.image_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

module.exports = {
  createAddress,
  getUserAddresses,
  getAddressById,
  getDefaultAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  getAddressCount,
  validateAddressData,
  mapAddressRow
};
