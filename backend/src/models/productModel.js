const pool = require('../config/db');

/**
 * Product Data Access Layer
 * Comprehensive product management with images, filtering, and statistics
 */

/**
 * Map database row to product object with images
 */
function mapProductRow(row) {
  if (!row) return null;
  
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    description: row.description,
    categoryTags: row.category_tags || [],
    quantity: parseInt(row.quantity, 10),
    unit: row.unit,
    minStock: parseInt(row.min_stock, 10),
    maxStock: parseInt(row.max_stock, 10),
    minOrderQuantity: parseInt(row.min_order_quantity, 10),
    price: parseFloat(row.price),
    status: row.status,
    primaryImageUrl: row.primary_image_url,
    images: row.images || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Computed fields
    stockStatus: row.stock_status,
    lowStockPercentage: row.low_stock_percentage
  };
}

/**
 * Create a new product with images
 */
async function createProduct(productData, imageUrls = []) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      sku, name, description, categoryTags, quantity, unit,
      minStock, maxStock, minOrderQuantity, price, status
    } = productData;
    
    // Set primary image URL
    const primaryImageUrl = imageUrls.length > 0 ? imageUrls[0].url : null;
    
    // Insert product
    const productQuery = `
      INSERT INTO products (
        sku, name, description, category_tags, quantity, unit,
        min_stock, max_stock, min_order_quantity, price, status, primary_image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    
    const productValues = [
      sku, name, description || null,
      JSON.stringify(categoryTags || []),
      quantity || 0, unit || 'unit',
      minStock || 0, maxStock || null,
      minOrderQuantity || 1, price || 0,
      status || 'active', primaryImageUrl
    ];
    
    const productResult = await client.query(productQuery, productValues);
    const product = productResult.rows[0];
    
    // Insert images if provided
    if (imageUrls.length > 0) {
      for (let i = 0; i < imageUrls.length; i++) {
        const imageData = imageUrls[i];
        await client.query(
          `INSERT INTO product_images (product_id, image_url, cloudinary_public_id, display_order, is_primary)
           VALUES ($1, $2, $3, $4, $5);`,
          [product.id, imageData.url, imageData.publicId, i, i === 0]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Fetch and return complete product with images
    return await findProductById(product.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Find all products with advanced filtering and pagination
 */
async function findAllProducts(filters = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    categoryTags,
    status,
    priceMin,
    priceMax,
    stockStatus, // 'low', 'out', 'healthy'
    sortBy = 'created_at',
    sortOrder = 'DESC'
  } = filters;
  
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const queryParams = [];
  
  // Search by name or SKU
  if (search) {
    queryParams.push(`%${search.toLowerCase()}%`);
    whereClauses.push(`(LOWER(name) LIKE $${queryParams.length} OR LOWER(sku) LIKE $${queryParams.length})`);
  }
  
  // Filter by status
  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }
  
  // Filter by category tags (JSONB contains)
  if (categoryTags && categoryTags.length > 0) {
    queryParams.push(JSON.stringify(categoryTags));
    whereClauses.push(`category_tags @> $${queryParams.length}::jsonb`);
  }
  
  // Filter by price range
  if (priceMin !== undefined) {
    queryParams.push(priceMin);
    whereClauses.push(`price >= $${queryParams.length}`);
  }
  
  if (priceMax !== undefined) {
    queryParams.push(priceMax);
    whereClauses.push(`price <= $${queryParams.length}`);
  }
  
  // Filter by stock status
  if (stockStatus === 'out') {
    whereClauses.push('quantity = 0');
  } else if (stockStatus === 'low') {
    whereClauses.push('quantity > 0 AND min_stock IS NOT NULL AND quantity <= min_stock');
  } else if (stockStatus === 'healthy') {
    whereClauses.push('(min_stock IS NULL OR quantity > min_stock)');
  }
  
  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  // Validate sort column to prevent SQL injection
  const allowedSortColumns = ['created_at', 'name', 'sku', 'price', 'quantity', 'updated_at'];
  const safeSortBy = allowedSortColumns.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  // Count query
  const countQuery = `SELECT COUNT(*) FROM products ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);
  
  // Data query with images
  const dataParams = [...queryParams, limit, offset];
  const dataQuery = `
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.image_url,
            'publicId', pi.cloudinary_public_id,
            'displayOrder', pi.display_order,
            'isPrimary', pi.is_primary
          ) ORDER BY pi.display_order
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) as images,
      CASE
        WHEN p.quantity = 0 THEN 'out'
        WHEN p.min_stock IS NOT NULL AND p.quantity <= p.min_stock THEN 'low'
        ELSE 'healthy'
      END as stock_status,
      CASE
        WHEN p.min_stock IS NOT NULL AND p.min_stock > 0 THEN ROUND((p.quantity::decimal / p.min_stock * 100), 2)
        ELSE NULL
      END as low_stock_percentage
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    ${whereString}
    GROUP BY p.id
    ORDER BY p.${safeSortBy} ${safeSortOrder}
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  
  const dataResult = await pool.query(dataQuery, dataParams);
  
  return {
    items: dataResult.rows.map(mapProductRow),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Find product by ID with images
 */
async function findProductById(id) {
  const query = `
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.image_url,
            'publicId', pi.cloudinary_public_id,
            'displayOrder', pi.display_order,
            'isPrimary', pi.is_primary
          ) ORDER BY pi.display_order
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) as images,
      CASE
        WHEN p.quantity = 0 THEN 'out'
        WHEN p.max_stock IS NOT NULL AND p.quantity < (p.max_stock * 0.1) THEN 'low'
        ELSE 'healthy'
      END as stock_status,
      CASE
        WHEN p.max_stock IS NOT NULL AND p.max_stock > 0 THEN ROUND((p.quantity::decimal / p.max_stock * 100), 2)
        ELSE NULL
      END as low_stock_percentage
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE p.id = $1
    GROUP BY p.id;
  `;
  
  const result = await pool.query(query, [id]);
  return mapProductRow(result.rows[0]);
}

/**
 * Find product by SKU
 */
async function findProductBySku(sku) {
  const query = `
    SELECT 
      p.*,
      COALESCE(
        json_agg(
          json_build_object(
            'id', pi.id,
            'url', pi.image_url,
            'publicId', pi.cloudinary_public_id,
            'displayOrder', pi.display_order,
            'isPrimary', pi.is_primary
          ) ORDER BY pi.display_order
        ) FILTER (WHERE pi.id IS NOT NULL),
        '[]'::json
      ) as images
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE p.sku = $1
    GROUP BY p.id;
  `;
  
  const result = await pool.query(query, [sku]);
  return mapProductRow(result.rows[0]);
}

/**
 * Update product with optional new images
 */
async function updateProduct(id, updates, newImageUrls = []) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const setClauses = [];
    const queryParams = [];
    
    const allowedFields = {
      name: 'name',
      description: 'description',
      categoryTags: 'category_tags',
      quantity: 'quantity',
      unit: 'unit',
      minStock: 'min_stock',
      maxStock: 'max_stock',
      minOrderQuantity: 'min_order_quantity',
      price: 'price',
      status: 'status'
    };
    
    Object.keys(updates).forEach((key) => {
      if (allowedFields[key] && updates[key] !== undefined) {
        queryParams.push(
          key === 'categoryTags' ? JSON.stringify(updates[key]) : updates[key]
        );
        setClauses.push(`${allowedFields[key]} = $${queryParams.length}`);
      }
    });
    
    if (setClauses.length === 0 && newImageUrls.length === 0) {
      await client.query('ROLLBACK');
      return await findProductById(id);
    }
    
    // Update product if there are changes
    if (setClauses.length > 0) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      queryParams.push(id);
      
      const updateQuery = `
        UPDATE products
        SET ${setClauses.join(', ')}
        WHERE id = $${queryParams.length}
        RETURNING *;
      `;
      
      await client.query(updateQuery, queryParams);
    }
    
    // Add new images if provided
    if (newImageUrls.length > 0) {
      // Get current max display order
      const maxOrderResult = await client.query(
        'SELECT COALESCE(MAX(display_order), -1) as max_order FROM product_images WHERE product_id = $1',
        [id]
      );
      let nextOrder = maxOrderResult.rows[0].max_order + 1;
      
      for (const imageData of newImageUrls) {
        await client.query(
          `INSERT INTO product_images (product_id, image_url, cloudinary_public_id, display_order, is_primary)
           VALUES ($1, $2, $3, $4, $5);`,
          [id, imageData.url, imageData.publicId, nextOrder, false]
        );
        nextOrder++;
      }
      
      // Update primary image URL if first image added
      const imageCountResult = await client.query(
        'SELECT COUNT(*) as count FROM product_images WHERE product_id = $1',
        [id]
      );
      
      if (parseInt(imageCountResult.rows[0].count) === newImageUrls.length) {
        await client.query(
          'UPDATE products SET primary_image_url = $1 WHERE id = $2',
          [newImageUrls[0].url, id]
        );
      }
    }
    
    await client.query('COMMIT');
    
    return await findProductById(id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete product (soft delete - set status to inactive)
 */
async function deleteProduct(id) {
  const query = `
    UPDATE products
    SET status = 'inactive', updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *;
  `;
  
  const result = await pool.query(query, [id]);
  return mapProductRow(result.rows[0]);
}

/**
 * Hard delete product (for admin cleanup)
 */
async function hardDeleteProduct(id) {
  const query = 'DELETE FROM products WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [id]);
  return mapProductRow(result.rows[0]);
}

/**
 * Bulk update product status
 */
async function bulkUpdateStatus(productIds, status) {
  const query = `
    UPDATE products
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = ANY($2::uuid[])
    RETURNING id, sku, name, status;
  `;
  
  const result = await pool.query(query, [status, productIds]);
  return result.rows;
}

/**
 * Get low stock products (quantity < 10% of max_stock)
 */
async function getLowStockProducts() {
  const query = `
    SELECT 
      p.*,
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
      ) as images,
      ROUND((p.quantity::decimal / p.min_stock * 100), 2) as stock_percentage
    FROM products p
    LEFT JOIN product_images pi ON p.id = pi.product_id
    WHERE p.min_stock IS NOT NULL 
      AND p.quantity <= p.min_stock
      AND p.quantity > 0
      AND p.status = 'active'
    GROUP BY p.id
    ORDER BY (p.quantity::decimal / p.min_stock) ASC;
  `;
  
  const result = await pool.query(query);
  return result.rows.map(mapProductRow);
}

/**
 * Get product statistics for dashboard
 */
async function getProductStats() {
  const query = `
    SELECT
      COUNT(*) as total_products,
      COUNT(*) FILTER (WHERE quantity > 0 AND status = 'active') as in_stock_count,
      COUNT(*) FILTER (
        WHERE min_stock IS NOT NULL 
        AND quantity <= min_stock 
        AND quantity > 0
        AND status = 'active'
      ) as low_stock_count,
      COUNT(*) FILTER (WHERE quantity = 0 AND status = 'active') as out_of_stock_count,
      COALESCE(SUM(price * quantity), 0) as total_inventory_value,
      COUNT(DISTINCT category_tags) FILTER (WHERE category_tags != '[]'::jsonb) as categories_count
    FROM products
    WHERE status = 'active';
  `;
  
  const result = await pool.query(query);
  const stats = result.rows[0];
  
  return {
    totalProducts: parseInt(stats.total_products, 10),
    inStockCount: parseInt(stats.in_stock_count, 10),
    lowStockCount: parseInt(stats.low_stock_count, 10),
    outOfStockCount: parseInt(stats.out_of_stock_count, 10),
    totalInventoryValue: parseFloat(stats.total_inventory_value),
    categoriesCount: parseInt(stats.categories_count, 10)
  };
}

/**
 * Get all unique category tags
 */
async function getAllCategoryTags() {
  const query = `
    SELECT DISTINCT jsonb_array_elements_text(category_tags) as tag
    FROM products
    WHERE category_tags != '[]'::jsonb
    ORDER BY tag;
  `;
  
  const result = await pool.query(query);
  return result.rows.map(row => row.tag);
}

// ============= Product Images Management =============

/**
 * Add image to product
 */
async function addProductImage(productId, imageUrl, publicId, displayOrder, isPrimary = false) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // If setting as primary, unset other primary images
    if (isPrimary) {
      await client.query(
        'UPDATE product_images SET is_primary = false WHERE product_id = $1',
        [productId]
      );
      
      // Update primary image URL in products table
      await client.query(
        'UPDATE products SET primary_image_url = $1 WHERE id = $2',
        [imageUrl, productId]
      );
    }
    
    const query = `
      INSERT INTO product_images (product_id, image_url, cloudinary_public_id, display_order, is_primary)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    
    const result = await client.query(query, [productId, imageUrl, publicId, displayOrder, isPrimary]);
    
    await client.query('COMMIT');
    
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Remove image from product
 */
async function removeProductImage(imageId) {
  const query = 'DELETE FROM product_images WHERE id = $1 RETURNING *;';
  const result = await pool.query(query, [imageId]);
  return result.rows[0];
}

/**
 * Reorder product images
 */
async function reorderProductImages(productId, imageOrderArray) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // imageOrderArray should be: [{id: 'uuid', displayOrder: 0}, ...]
    for (const item of imageOrderArray) {
      await client.query(
        'UPDATE product_images SET display_order = $1 WHERE id = $2 AND product_id = $3',
        [item.displayOrder, item.id, productId]
      );
    }
    
    await client.query('COMMIT');
    
    return { success: true, message: 'Images reordered successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Set primary image
 */
async function setPrimaryImage(productId, imageId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get the image URL
    const imageResult = await client.query(
      'SELECT image_url FROM product_images WHERE id = $1 AND product_id = $2',
      [imageId, productId]
    );
    
    if (imageResult.rows.length === 0) {
      throw new Error('Image not found');
    }
    
    const imageUrl = imageResult.rows[0].image_url;
    
    // Unset all primary flags for this product
    await client.query(
      'UPDATE product_images SET is_primary = false WHERE product_id = $1',
      [productId]
    );
    
    // Set new primary image
    await client.query(
      'UPDATE product_images SET is_primary = true WHERE id = $1',
      [imageId]
    );
    
    // Update primary image URL in products table
    await client.query(
      'UPDATE products SET primary_image_url = $1 WHERE id = $2',
      [imageUrl, productId]
    );
    
    await client.query('COMMIT');
    
    return { success: true, message: 'Primary image updated' };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============= Pricing & Margin Management =============

async function getAllPricingData(filters = {}) {
  const { page = 1, limit = 20, search, category, status } = filters;
  const offset = (page - 1) * limit;
  const queryParams = [];
  const whereClauses = [];

  if (search) {
    queryParams.push(`%${search.toLowerCase()}%`);
    whereClauses.push(`(LOWER(name) LIKE $${queryParams.length} OR LOWER(sku) LIKE $${queryParams.length})`);
  }
  
  if (category) {
    queryParams.push(`"%${category}%"`); 
    whereClauses.push(`category_tags::text LIKE $${queryParams.length}`);
  }

  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  } else {
    whereClauses.push(`status != 'inactive'`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  
  const countQuery = `SELECT COUNT(*) FROM products ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...queryParams, limit, offset];
  const query = `
    SELECT 
      id, sku, name, category_tags,
      price as "retailPrice",
      wholesale_price as "wholesalePrice",
      cost_price as "costPrice",
      previous_price as "previousRetailPrice",
      last_changed as "lastChanged",
      changed_by as "changedBy",
      updated_at as "lastUpdated"
    FROM products
    ${whereString}
    ORDER BY name ASC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;
  
  const result = await pool.query(query, dataParams);
  
  const products = result.rows.map(row => {
    let category = null;
    if (row.category_tags && row.category_tags.length > 0) {
      category = row.category_tags[0];
    }
    
    let margin = null;
    const retail = parseFloat(row.retailPrice || 0);
    const cost = parseFloat(row.costPrice || 0);
    if (retail > 0 && cost > 0) {
      margin = ((retail - cost) / retail) * 100;
    }

    return {
      id: row.id,
      productId: row.id,
      productName: row.name,
      sku: row.sku,
      category,
      retailPrice: retail,
      wholesalePrice: row.wholesalePrice ? parseFloat(row.wholesalePrice) : null,
      costPrice: cost > 0 ? cost : null,
      previousRetailPrice: row.previousRetailPrice ? parseFloat(row.previousRetailPrice) : null,
      margin,
      lastChanged: row.lastChanged,
      lastUpdated: row.lastUpdated,
      changedBy: row.changedBy
    };
  });

  return { products, total };
}

async function getPricingStats() {
  const query = `
    SELECT
      COUNT(*) as total_products,
      AVG(price) as avg_retail_price,
      COUNT(CASE WHEN price > previous_price THEN 1 END) as price_increases,
      COUNT(CASE WHEN price < previous_price THEN 1 END) as price_decreases,
      AVG(CASE WHEN price > 0 AND cost_price > 0 THEN ((price - cost_price) / price) * 100 ELSE NULL END) as avg_margin
    FROM products
    WHERE status != 'inactive' AND price > 0;
  `;
  const result = await pool.query(query);
  const stats = result.rows[0];
  
  return {
    totalProducts: parseInt(stats.total_products || 0, 10),
    avgRetailPrice: parseFloat(stats.avg_retail_price || 0),
    avgMargin: parseFloat(stats.avg_margin || 0),
    priceIncreases: parseInt(stats.price_increases || 0, 10),
    priceDecreases: parseInt(stats.price_decreases || 0, 10)
  };
}

async function updateProductPricing(id, { retailPrice, wholesalePrice, costPrice }, reason, changedBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const getProductQuery = 'SELECT price, wholesale_price, cost_price FROM products WHERE id = $1 FOR UPDATE';
    const productResult = await client.query(getProductQuery, [id]);
    
    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }
    
    const current = productResult.rows[0];
    const prevRetail = parseFloat(current.price || 0);
    const prevWholesale = parseFloat(current.wholesale_price || 0);
    const prevCost = parseFloat(current.cost_price || 0);
    
    let adminId = null;
    if (changedBy) {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (uuidRegex.test(changedBy)) {
        adminId = changedBy;
      } else {
        const userResult = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [changedBy]);
        if (userResult.rows.length > 0) {
          adminId = userResult.rows[0].id;
        }
      }
    }
    
    const updateQuery = `
      UPDATE products 
      SET 
        previous_price = price,
        price = COALESCE($1, price),
        wholesale_price = COALESCE($2, wholesale_price),
        cost_price = COALESCE($3, cost_price),
        last_changed = CURRENT_TIMESTAMP,
        changed_by = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *;
    `;
    const updateResult = await client.query(updateQuery, [retailPrice, wholesalePrice, costPrice, adminId, id]);
    
    const newRetail = parseFloat(updateResult.rows[0].price || 0);
    
    const historyQuery = `
      INSERT INTO price_history (
        product_id, previous_price, new_price, 
        previous_wholesale, new_wholesale, 
        previous_cost, new_cost,
        change_type, reason, changed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    await client.query(historyQuery, [
      id, prevRetail, retailPrice, 
      prevWholesale, wholesalePrice, 
      prevCost, costPrice,
      'manual', reason || 'Manual update', adminId
    ]);
    
    await client.query('COMMIT');
    
    return {
      productId: id,
      previousPrice: prevRetail,
      newPrice: retailPrice || newRetail,
      change: (retailPrice || newRetail) - prevRetail,
      changePercentage: prevRetail > 0 ? (((retailPrice || newRetail) - prevRetail) / prevRetail) * 100 : 0,
      updatedBy: changedBy,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function bulkUpdatePricing(productIds, { adjustmentType, adjustmentValue, applyTo, reason }, changedBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let updatedCount = 0;

    let adminId = null;
    if (changedBy) {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
      if (uuidRegex.test(changedBy)) {
        adminId = changedBy;
      } else {
        const userResult = await client.query('SELECT id FROM users WHERE firebase_uid = $1', [changedBy]);
        if (userResult.rows.length > 0) {
          adminId = userResult.rows[0].id;
        }
      }
    }
    
    for (const id of productIds) {
      const getProductQuery = 'SELECT price, wholesale_price, cost_price FROM products WHERE id = $1 FOR UPDATE';
      const productResult = await client.query(getProductQuery, [id]);
      
      if (productResult.rows.length === 0) continue;
      
      const current = productResult.rows[0];
      const prevRetail = parseFloat(current.price || 0);
      const prevWholesale = parseFloat(current.wholesale_price || 0);
      
      let newRetail = prevRetail;
      let newWholesale = prevWholesale;
      
      if (applyTo === 'retail' || applyTo === 'both') {
        if (adjustmentType === 'percentage') {
          newRetail = prevRetail * (1 + (adjustmentValue / 100));
        } else {
          newRetail = prevRetail + adjustmentValue;
        }
        newRetail = Math.max(0, newRetail); // ensure not negative
      }
      
      if (applyTo === 'wholesale' || applyTo === 'both') {
        if (adjustmentType === 'percentage') {
          newWholesale = prevWholesale * (1 + (adjustmentValue / 100));
        } else {
          newWholesale = prevWholesale + adjustmentValue;
        }
        newWholesale = Math.max(0, newWholesale);
      }
      
      // Update if changed
      if (newRetail !== prevRetail || newWholesale !== prevWholesale) {
        await client.query(`
          UPDATE products 
          SET previous_price = price, price = $1, wholesale_price = $2,
              last_changed = CURRENT_TIMESTAMP, changed_by = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newRetail, newWholesale, adminId, id]);
        
        await client.query(`
          INSERT INTO price_history (
            product_id, previous_price, new_price, 
            previous_wholesale, new_wholesale, 
            previous_cost, new_cost,
            change_type, reason, changed_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          id, prevRetail, newRetail, prevWholesale, newWholesale,
          current.cost_price, current.cost_price,
          'bulk', reason || 'Bulk update', adminId
        ]);
        
        updatedCount++;
      }
    }
    
    await client.query('COMMIT');
    return { updated: updatedCount };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getPriceHistory(productId, limit = 50) {
  const query = `
    SELECT 
      previous_price as "previousPrice",
      new_price as "newPrice",
      previous_wholesale as "previousWholesale",
      new_wholesale as "newWholesale",
      change_type as "changeType",
      reason,
      changed_by as "changedBy",
      created_at as "createdAt"
    FROM price_history
    WHERE product_id = $1
    ORDER BY created_at DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [productId, limit]);
  return result.rows;
}

module.exports = {
  createProduct,
  findAllProducts,
  findProductById,
  findProductBySku,
  updateProduct,
  deleteProduct,
  hardDeleteProduct,
  bulkUpdateStatus,
  getLowStockProducts,
  getProductStats,
  getAllCategoryTags,
  addProductImage,
  removeProductImage,
  reorderProductImages,
  setPrimaryImage,
  getAllPricingData,
  getPricingStats,
  updateProductPricing,
  bulkUpdatePricing,
  getPriceHistory
};
