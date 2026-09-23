const pool = require('../config/db');

/**
 * Cart Data Access Layer
 * Shopping cart management with persistent storage
 */

/**
 * Add item to user's cart
 * If item already exists, update quantity
 */
async function addToCart(userId, productId, quantity) {
  try {
    const query = `
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id) 
      DO UPDATE SET 
        quantity = cart_items.quantity + EXCLUDED.quantity,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    
    const result = await pool.query(query, [userId, productId, quantity]);
    
    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      productId: result.rows[0].product_id,
      quantity: parseInt(result.rows[0].quantity, 10),
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Get user's cart with complete product details and stock validation
 */
async function getUserCart(userId) {
  const query = `
    SELECT 
      c.id as cart_item_id,
      c.quantity as cart_quantity,
      c.created_at as added_at,
      c.updated_at as updated_at,
      p.id,
      p.sku,
      p.name,
      p.description,
      p.category_tags,
      p.quantity as available_quantity,
      p.unit,
      p.min_order_quantity,
      p.price,
      p.status,
      p.primary_image_url,
      CASE
        WHEN p.quantity = 0 THEN 'out'
        WHEN p.quantity < c.quantity THEN 'insufficient'
        WHEN p.max_stock IS NOT NULL AND p.quantity < (p.max_stock * 0.1) THEN 'low'
        ELSE 'healthy'
      END as stock_status,
      CASE
        WHEN p.quantity = 0 THEN true
        WHEN p.quantity < c.quantity THEN true
        ELSE false
      END as has_stock_issue,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.image_url,
            'displayOrder', pi.display_order,
            'isPrimary', pi.is_primary
          ) ORDER BY pi.display_order
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) as images
    FROM cart_items c
    INNER JOIN products p ON c.product_id = p.id
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE c.user_id = $1 AND p.status = 'active'
    GROUP BY c.id, c.quantity, c.created_at, c.updated_at, p.id
    ORDER BY c.created_at DESC;
  `;
  
  const result = await pool.query(query, [userId]);
  
  return result.rows.map(row => ({
    cartItemId: row.cart_item_id,
    quantity: parseInt(row.cart_quantity, 10),
    addedAt: row.added_at,
    updatedAt: row.updated_at,
    product: {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryTags: row.category_tags || [],
      availableQuantity: parseInt(row.available_quantity, 10),
      unit: row.unit,
      minOrderQuantity: parseInt(row.min_order_quantity, 10),
      price: parseFloat(row.price),
      status: row.status,
      primaryImageUrl: row.primary_image_url,
      stockStatus: row.stock_status,
      hasStockIssue: row.has_stock_issue,
      images: row.images
    }
  }));
}

/**
 * Update cart item quantity
 * Set quantity to specific value (not increment)
 */
async function updateCartItem(userId, productId, quantity) {
  // Ensure quantity is positive
  if (quantity <= 0) {
    return await removeFromCart(userId, productId);
  }

  const query = `
    UPDATE cart_items
    SET quantity = $3, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND product_id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [userId, productId, quantity]);
  
  if (result.rows.length === 0) {
    return { notFound: true, message: 'Item not in cart' };
  }
  
  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    productId: result.rows[0].product_id,
    quantity: parseInt(result.rows[0].quantity, 10),
    updatedAt: result.rows[0].updated_at
  };
}

/**
 * Remove item from cart
 */
async function removeFromCart(userId, productId) {
  const query = `
    DELETE FROM cart_items
    WHERE user_id = $1 AND product_id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [userId, productId]);
  
  if (result.rows.length === 0) {
    return { notFound: true, message: 'Item not in cart' };
  }
  
  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    productId: result.rows[0].product_id,
    quantity: parseInt(result.rows[0].quantity, 10)
  };
}

/**
 * Clear entire cart for user
 */
async function clearCart(userId) {
  const query = 'DELETE FROM cart_items WHERE user_id = $1 RETURNING *;';
  const result = await pool.query(query, [userId]);
  return { deletedCount: result.rows.length };
}

/**
 * Get cart item count for user
 */
async function getCartCount(userId) {
  const query = `
    SELECT COALESCE(SUM(quantity), 0) as count
    FROM cart_items c
    INNER JOIN products p ON c.product_id = p.id
    WHERE c.user_id = $1 AND p.status = 'active';
  `;
  
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Check if product is in user's cart
 */
async function isInCart(userId, productId) {
  const query = `
    SELECT quantity
    FROM cart_items
    WHERE user_id = $1 AND product_id = $2;
  `;
  
  const result = await pool.query(query, [userId, productId]);
  
  if (result.rows.length === 0) {
    return { inCart: false, quantity: 0 };
  }
  
  return { 
    inCart: true, 
    quantity: parseInt(result.rows[0].quantity, 10) 
  };
}

/**
 * Move cart item to saved for later
 * Uses transaction to ensure atomicity
 */
async function moveToSavedForLater(userId, productId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get current cart item
    const getQuery = `
      SELECT quantity FROM cart_items
      WHERE user_id = $1 AND product_id = $2;
    `;
    const getResult = await client.query(getQuery, [userId, productId]);
    
    if (getResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { notFound: true, message: 'Item not in cart' };
    }
    
    const quantity = getResult.rows[0].quantity;
    
    // Delete from cart
    await client.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    
    // Insert into saved_for_later (or update if already exists)
    const saveQuery = `
      INSERT INTO saved_for_later (user_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id) 
      DO UPDATE SET quantity = EXCLUDED.quantity
      RETURNING *;
    `;
    const saveResult = await client.query(saveQuery, [userId, productId, quantity]);
    
    await client.query('COMMIT');
    
    return {
      id: saveResult.rows[0].id,
      userId: saveResult.rows[0].user_id,
      productId: saveResult.rows[0].product_id,
      quantity: parseInt(saveResult.rows[0].quantity, 10),
      createdAt: saveResult.rows[0].created_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get saved for later items with product details
 */
async function getSavedItems(userId) {
  const query = `
    SELECT 
      s.id as saved_item_id,
      s.quantity as saved_quantity,
      s.created_at as saved_at,
      p.id,
      p.sku,
      p.name,
      p.description,
      p.category_tags,
      p.quantity as available_quantity,
      p.unit,
      p.min_order_quantity,
      p.price,
      p.status,
      p.primary_image_url,
      CASE
        WHEN p.quantity = 0 THEN 'out'
        WHEN p.quantity < s.quantity THEN 'insufficient'
        WHEN p.max_stock IS NOT NULL AND p.quantity < (p.max_stock * 0.1) THEN 'low'
        ELSE 'healthy'
      END as stock_status,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.image_url,
            'displayOrder', pi.display_order,
            'isPrimary', pi.is_primary
          ) ORDER BY pi.display_order
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) as images
    FROM saved_for_later s
    INNER JOIN products p ON s.product_id = p.id
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE s.user_id = $1 AND p.status = 'active'
    GROUP BY s.id, s.quantity, s.created_at, p.id
    ORDER BY s.created_at DESC;
  `;
  
  const result = await pool.query(query, [userId]);
  
  return result.rows.map(row => ({
    savedItemId: row.saved_item_id,
    quantity: parseInt(row.saved_quantity, 10),
    savedAt: row.saved_at,
    product: {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryTags: row.category_tags || [],
      availableQuantity: parseInt(row.available_quantity, 10),
      unit: row.unit,
      minOrderQuantity: parseInt(row.min_order_quantity, 10),
      price: parseFloat(row.price),
      status: row.status,
      primaryImageUrl: row.primary_image_url,
      stockStatus: row.stock_status,
      images: row.images
    }
  }));
}

/**
 * Move saved item back to cart
 * Uses transaction to ensure atomicity
 */
async function moveToCart(userId, productId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get saved item
    const getQuery = `
      SELECT quantity FROM saved_for_later
      WHERE user_id = $1 AND product_id = $2;
    `;
    const getResult = await client.query(getQuery, [userId, productId]);
    
    if (getResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { notFound: true, message: 'Item not in saved list' };
    }
    
    const quantity = getResult.rows[0].quantity;
    
    // Delete from saved_for_later
    await client.query(
      'DELETE FROM saved_for_later WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    
    // Insert into cart (or update if already exists)
    const cartQuery = `
      INSERT INTO cart_items (user_id, product_id, quantity)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, product_id) 
      DO UPDATE SET 
        quantity = cart_items.quantity + EXCLUDED.quantity,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *;
    `;
    const cartResult = await client.query(cartQuery, [userId, productId, quantity]);
    
    await client.query('COMMIT');
    
    return {
      id: cartResult.rows[0].id,
      userId: cartResult.rows[0].user_id,
      productId: cartResult.rows[0].product_id,
      quantity: parseInt(cartResult.rows[0].quantity, 10),
      createdAt: cartResult.rows[0].created_at,
      updatedAt: cartResult.rows[0].updated_at
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Remove item from saved for later
 */
async function removeSavedItem(userId, productId) {
  const query = `
    DELETE FROM saved_for_later
    WHERE user_id = $1 AND product_id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [userId, productId]);
  
  if (result.rows.length === 0) {
    return { notFound: true, message: 'Item not in saved list' };
  }
  
  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    productId: result.rows[0].product_id,
    quantity: parseInt(result.rows[0].quantity, 10)
  };
}

/**
 * Move cart item to wishlist
 * Requires wishlist model for the wishlist part
 * This is a convenience function that combines cart removal with wishlist addition
 */
async function moveToWishlist(userId, productId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if item exists in cart
    const checkQuery = `
      SELECT * FROM cart_items
      WHERE user_id = $1 AND product_id = $2;
    `;
    const checkResult = await client.query(checkQuery, [userId, productId]);
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { notFound: true, message: 'Item not in cart' };
    }
    
    // Delete from cart
    await client.query(
      'DELETE FROM cart_items WHERE user_id = $1 AND product_id = $2',
      [userId, productId]
    );
    
    // Add to wishlist (ignore if already exists)
    await client.query(
      `INSERT INTO wishlists (user_id, product_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, product_id) DO NOTHING`,
      [userId, productId]
    );
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Item moved to wishlist'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  addToCart,
  getUserCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount,
  isInCart,
  moveToSavedForLater,
  getSavedItems,
  moveToCart,
  removeSavedItem,
  moveToWishlist
};
