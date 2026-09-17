const pool = require('../config/db');

/**
 * Wishlist Data Access Layer
 * User wishlist management for saved products
 */

/**
 * Add product to user's wishlist
 */
async function addToWishlist(userId, productId) {
  try {
    const query = `
      INSERT INTO wishlists (user_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, product_id) DO NOTHING
      RETURNING *;
    `;
    
    const result = await pool.query(query, [userId, productId]);
    
    if (result.rows.length === 0) {
      // Already exists
      return { alreadyExists: true, message: 'Product already in wishlist' };
    }
    
    return {
      id: result.rows[0].id,
      userId: result.rows[0].user_id,
      productId: result.rows[0].product_id,
      createdAt: result.rows[0].created_at
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Remove product from user's wishlist
 */
async function removeFromWishlist(userId, productId) {
  const query = `
    DELETE FROM wishlists
    WHERE user_id = $1 AND product_id = $2
    RETURNING *;
  `;
  
  const result = await pool.query(query, [userId, productId]);
  
  if (result.rows.length === 0) {
    return { notFound: true, message: 'Product not in wishlist' };
  }
  
  return {
    id: result.rows[0].id,
    userId: result.rows[0].user_id,
    productId: result.rows[0].product_id
  };
}

/**
 * Get user's wishlist with product details
 */
async function getUserWishlist(userId) {
  const query = `
    SELECT 
      w.id as wishlist_id,
      w.created_at as added_at,
      p.id,
      p.sku,
      p.name,
      p.description,
      p.category_tags,
      p.quantity,
      p.unit,
      p.min_order_quantity,
      p.price,
      p.status,
      p.primary_image_url,
      CASE
        WHEN p.quantity = 0 THEN 'out'
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
    FROM wishlists w
    INNER JOIN products p ON w.product_id = p.id
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE w.user_id = $1 AND p.status = 'active'
    GROUP BY w.id, w.created_at, p.id
    ORDER BY w.created_at DESC;
  `;
  
  const result = await pool.query(query, [userId]);
  
  return result.rows.map(row => ({
    wishlistId: row.wishlist_id,
    addedAt: row.added_at,
    product: {
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      categoryTags: row.category_tags || [],
      quantity: parseInt(row.quantity, 10),
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
 * Check if product is in user's wishlist
 */
async function isInWishlist(userId, productId) {
  const query = `
    SELECT COUNT(*) as count
    FROM wishlists
    WHERE user_id = $1 AND product_id = $2;
  `;
  
  const result = await pool.query(query, [userId, productId]);
  return parseInt(result.rows[0].count, 10) > 0;
}

/**
 * Get wishlist count for user
 */
async function getWishlistCount(userId) {
  const query = `
    SELECT COUNT(*) as count
    FROM wishlists w
    INNER JOIN products p ON w.product_id = p.id
    WHERE w.user_id = $1 AND p.status = 'active';
  `;
  
  const result = await pool.query(query, [userId]);
  return parseInt(result.rows[0].count, 10);
}

/**
 * Clear user's wishlist
 */
async function clearWishlist(userId) {
  const query = 'DELETE FROM wishlists WHERE user_id = $1 RETURNING *;';
  const result = await pool.query(query, [userId]);
  return { deletedCount: result.rows.length };
}

module.exports = {
  addToWishlist,
  removeFromWishlist,
  getUserWishlist,
  isInWishlist,
  getWishlistCount,
  clearWishlist
};
