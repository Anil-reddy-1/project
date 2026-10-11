const pool = require('../config/db');

/**
 * Product Data Access Layer
 * Comprehensive product management with images, filtering, and statistics
 */

/**
 * Map database row to product object with images
 */
function mapProductRow(row, includeCost = false) {
  if (!row) return null;

  const sellingPrice = row.selling_price
    ? parseFloat(row.selling_price)
    : parseFloat(row.price || 0);
  const displayPrice = row.display_price ? parseFloat(row.display_price) : null;

  // Discount is calculated from display vs selling — NEVER from cost
  const discountAmount = displayPrice !== null && sellingPrice > 0
    ? parseFloat((displayPrice - sellingPrice).toFixed(2))
    : null;
  const discountPercent = displayPrice !== null && displayPrice > 0 && sellingPrice > 0
    ? parseFloat(((displayPrice - sellingPrice) / displayPrice * 100).toFixed(2))
    : null;

  const product = {
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
    // Buyer-facing prices (cost_price is intentionally omitted unless includeCost is explicitly true for admin)
    price: sellingPrice,          // backwards-compat alias
    sellingPrice,
    displayPrice,                  // null means no reference price / MRP
    discountAmount: discountAmount !== null && discountAmount > 0 ? discountAmount : null,
    discountPercent: discountPercent !== null && discountPercent > 0 ? discountPercent : null,
    status: row.status,
    primaryImageUrl: row.primary_image_url,
    images: row.images || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Computed fields
    stockStatus: row.stock_status,
    lowStockPercentage: row.low_stock_percentage
  };

  if (includeCost) {
    product.costPrice = row.cost_price ? parseFloat(row.cost_price) : null;
    product.minimumMarginPercent = row.minimum_margin_percent ? parseFloat(row.minimum_margin_percent) : null;
  }

  return product;
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
      minStock, maxStock, minOrderQuantity, price, status,
      sellingPrice, costPrice, displayPrice, minimumMarginPercent
    } = productData;

    const effectiveSelling = sellingPrice !== undefined && sellingPrice !== null && sellingPrice !== ''
      ? parseFloat(sellingPrice)
      : (price !== undefined && price !== null && price !== '' ? parseFloat(price) : 0);
    const effectiveCost = costPrice !== undefined && costPrice !== null && costPrice !== ''
      ? parseFloat(costPrice)
      : null;
    const effectiveDisplay = displayPrice !== undefined && displayPrice !== null && displayPrice !== ''
      ? parseFloat(displayPrice)
      : null;
    const effectiveMinMargin = minimumMarginPercent !== undefined && minimumMarginPercent !== null && minimumMarginPercent !== ''
      ? parseFloat(minimumMarginPercent)
      : null;
    
    // Set primary image URL
    const primaryImageUrl = imageUrls.length > 0 ? imageUrls[0].url : null;
    
    // Insert product
    const productQuery = `
      INSERT INTO products (
        sku, name, description, category_tags, quantity, unit,
        min_stock, max_stock, min_order_quantity, price, status, primary_image_url,
        cost_price, display_price, selling_price, minimum_margin_percent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *;
    `;
    
    const productValues = [
      sku, name, description || null,
      JSON.stringify(categoryTags || []),
      quantity || 0, unit || 'unit',
      minStock || 0, maxStock || null,
      minOrderQuantity || 1, effectiveSelling,
      status || 'active', primaryImageUrl,
      effectiveCost, effectiveDisplay, effectiveSelling, effectiveMinMargin
    ];
    
    const productResult = await client.query(productQuery, productValues);
    const product = productResult.rows[0];

    // Record initial price history if pricing is set
    if (effectiveCost !== null || effectiveDisplay !== null || effectiveSelling > 0) {
      await client.query(`
        INSERT INTO price_history (
          product_id,
          new_cost,
          new_display_price,
          new_selling_price,
          change_type,
          reason
        ) VALUES ($1, $2, $3, $4, $5, $6);
      `, [
        product.id,
        effectiveCost,
        effectiveDisplay,
        effectiveSelling,
        'create',
        'Initial product creation pricing'
      ]);
    }
    
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
    
    // Fetch and return complete product with images (including cost for admin creator)
    return await findProductById(product.id, true);
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
async function findAllProducts(filters = {}, includeCost = false) {
  const shouldIncludeCost = Boolean(includeCost || filters.includeCost);
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
    items: dataResult.rows.map(row => mapProductRow(row, shouldIncludeCost)),
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
async function findProductById(id, includeCost = false) {
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
  return mapProductRow(result.rows[0], includeCost);
}

/**
 * Find product by SKU
 */
async function findProductBySku(sku, includeCost = false) {
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
  return mapProductRow(result.rows[0], includeCost);
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
      status: 'status',
      costPrice: 'cost_price',
      displayPrice: 'display_price',
      minimumMarginPercent: 'minimum_margin_percent'
    };
    
    Object.keys(updates).forEach((key) => {
      if (allowedFields[key] && updates[key] !== undefined) {
        const val = updates[key] === '' ? null : updates[key];
        queryParams.push(
          key === 'categoryTags' ? JSON.stringify(val) : val
        );
        setClauses.push(`${allowedFields[key]} = $${queryParams.length}`);
      }
    });

    // Handle sellingPrice and price synchronization
    if (updates.sellingPrice !== undefined) {
      const sp = updates.sellingPrice === '' ? null : parseFloat(updates.sellingPrice);
      queryParams.push(sp);
      setClauses.push(`selling_price = $${queryParams.length}`);
      queryParams.push(sp);
      setClauses.push(`price = $${queryParams.length}`);
    } else if (updates.price !== undefined) {
      const sp = updates.price === '' ? null : parseFloat(updates.price);
      queryParams.push(sp);
      setClauses.push(`price = $${queryParams.length}`);
      queryParams.push(sp);
      setClauses.push(`selling_price = $${queryParams.length}`);
    }
    
    if (setClauses.length === 0 && newImageUrls.length === 0) {
      await client.query('ROLLBACK');
      return await findProductById(id, true);
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
    
    return await findProductById(id, true);
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

/**
 * Calculate all derived pricing metrics from the 4-field model
 * IMPORTANT: cost_price is NEVER returned in buyer-facing API responses.
 */
function calcPricingMetrics(costPrice, displayPrice, sellingPrice) {
  const cost = parseFloat(costPrice || 0);
  const display = parseFloat(displayPrice || 0);
  const selling = parseFloat(sellingPrice || 0);

  const discountAmount = display > 0 && selling > 0 ? display - selling : null;
  const discountPercent = display > 0 && selling > 0 ? ((display - selling) / display) * 100 : null;
  const grossProfit = selling > 0 && cost > 0 ? selling - cost : null;
  const grossMarginPercent = selling > 0 && cost > 0 ? ((selling - cost) / selling) * 100 : null;
  const markupPercent = cost > 0 && selling > 0 ? ((selling - cost) / cost) * 100 : null;

  return {
    discountAmount: discountAmount !== null ? parseFloat(discountAmount.toFixed(2)) : null,
    discountPercent: discountPercent !== null ? parseFloat(discountPercent.toFixed(2)) : null,
    grossProfit: grossProfit !== null ? parseFloat(grossProfit.toFixed(2)) : null,
    grossMarginPercent: grossMarginPercent !== null ? parseFloat(grossMarginPercent.toFixed(2)) : null,
    markupPercent: markupPercent !== null ? parseFloat(markupPercent.toFixed(2)) : null,
  };
}

/**
 * Suggest selling price for a given cost and target margin.
 * Formula: sellingPrice = costPrice / (1 - targetMargin)
 */
function suggestSellingPrice(costPrice, targetMarginPercent) {
  const cost = parseFloat(costPrice || 0);
  const margin = parseFloat(targetMarginPercent || 0) / 100;
  if (cost <= 0 || margin >= 1 || margin < 0) return null;
  return parseFloat((cost / (1 - margin)).toFixed(2));
}

async function getAllPricingData(filters = {}) {
  const { search, category, status, minMargin, maxMargin, hasDiscount } = filters;
  const pageNum = Number.isFinite(Number(filters.page)) && Number(filters.page) > 0 ? Math.floor(Number(filters.page)) : 1;
  const limitNum = Number.isFinite(Number(filters.limit)) && Number(filters.limit) > 0 ? Math.floor(Number(filters.limit)) : 20;
  const offset = (pageNum - 1) * limitNum;
  const queryParams = [];
  const whereClauses = [];

  if (search) {
    queryParams.push(`%${search.toLowerCase()}%`);
    whereClauses.push(`(LOWER(p.name) LIKE $${queryParams.length} OR LOWER(p.sku) LIKE $${queryParams.length})`);
  }

  if (category) {
    queryParams.push(`"%${category}%"`);
    whereClauses.push(`p.category_tags::text LIKE $${queryParams.length}`);
  }

  if (status) {
    queryParams.push(status);
    whereClauses.push(`p.status = $${queryParams.length}`);
  } else {
    whereClauses.push(`p.status != 'inactive'`);
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) FROM products p ${whereString};`;
  const countResult = await pool.query(countQuery, queryParams);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...queryParams, limitNum, offset];
  const query = `
    SELECT
      p.id, p.sku, p.name, p.category_tags, p.status, p.quantity,
      p.cost_price      AS "costPrice",
      p.display_price   AS "displayPrice",
      p.selling_price   AS "sellingPrice",
      COALESCE(p.selling_price, p.price) AS "effectiveSellingPrice",
      p.minimum_margin_percent AS "minimumMarginPercent",
      p.last_changed    AS "lastChanged",
      p.changed_by      AS "changedBy",
      p.updated_at      AS "lastUpdated",
      u.name            AS "changedByName"
    FROM products p
    LEFT JOIN users u ON p.changed_by = u.id
    ${whereString}
    ORDER BY p.name ASC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length};
  `;

  const result = await pool.query(query, dataParams);

  let products = result.rows.map(row => {
    const cost = row.costPrice ? parseFloat(row.costPrice) : null;
    const display = row.displayPrice ? parseFloat(row.displayPrice) : null;
    const selling = row.effectiveSellingPrice ? parseFloat(row.effectiveSellingPrice) : null;
    const metrics = calcPricingMetrics(cost, display, selling);
    const minMarginPct = row.minimumMarginPercent ? parseFloat(row.minimumMarginPercent) : null;
    const isBelowMinMargin = minMarginPct !== null && metrics.grossMarginPercent !== null
      ? metrics.grossMarginPercent < minMarginPct
      : false;

    let category = null;
    if (row.category_tags && row.category_tags.length > 0) {
      category = row.category_tags[0];
    }

    return {
      id: row.id,
      productId: row.id,
      productName: row.name,
      sku: row.sku,
      category,
      status: row.status,
      quantity: parseInt(row.quantity, 10),
      costPrice: cost,
      displayPrice: display,
      sellingPrice: selling,
      minimumMarginPercent: minMarginPct,
      // Computed metrics
      discountAmount: metrics.discountAmount,
      discountPercent: metrics.discountPercent,
      grossProfit: metrics.grossProfit,
      grossMarginPercent: metrics.grossMarginPercent,
      markupPercent: metrics.markupPercent,
      isBelowMinMargin,
      // Audit
      lastChanged: row.lastChanged,
      lastUpdated: row.lastUpdated,
      changedBy: row.changedBy,
      changedByName: row.changedByName || null,
    };
  });

  // Post-query filters that require computed values
  if (minMargin !== undefined) {
    products = products.filter(p => p.grossMarginPercent !== null && p.grossMarginPercent >= parseFloat(minMargin));
  }
  if (maxMargin !== undefined) {
    products = products.filter(p => p.grossMarginPercent !== null && p.grossMarginPercent <= parseFloat(maxMargin));
  }
  if (hasDiscount === 'true' || hasDiscount === true) {
    products = products.filter(p => p.discountPercent !== null && p.discountPercent > 0);
  }

  return { products, total };
}

async function getPricingStats() {
  const query = `
    SELECT
      COUNT(*)                                                        AS total_products,
      AVG(COALESCE(selling_price, price))                             AS avg_selling_price,
      AVG(
        CASE
          WHEN COALESCE(selling_price, price) > 0 AND cost_price > 0
          THEN ((COALESCE(selling_price, price) - cost_price) / COALESCE(selling_price, price)) * 100
          ELSE NULL
        END
      )                                                               AS avg_margin,
      COUNT(
        CASE
          WHEN display_price IS NOT NULL
            AND COALESCE(selling_price, price) < display_price THEN 1
        END
      )                                                               AS products_on_offer,
      COUNT(
        CASE
          WHEN minimum_margin_percent IS NOT NULL
            AND cost_price IS NOT NULL
            AND COALESCE(selling_price, price) > 0
            AND ((COALESCE(selling_price, price) - cost_price) / COALESCE(selling_price, price)) * 100
              < minimum_margin_percent
          THEN 1
        END
      )                                                               AS low_margin_products
    FROM products
    WHERE status != 'inactive';
  `;
  const result = await pool.query(query);
  const stats = result.rows[0];

  return {
    totalProducts: parseInt(stats.total_products || 0, 10),
    avgSellingPrice: parseFloat(stats.avg_selling_price || 0),
    avgMargin: parseFloat(stats.avg_margin || 0),
    productsOnOffer: parseInt(stats.products_on_offer || 0, 10),
    lowMarginProducts: parseInt(stats.low_margin_products || 0, 10),
  };
}

async function updateProductPricing(id, { costPrice, displayPrice, sellingPrice, minimumMarginPercent }, reason, changedBy) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const getProductQuery = `
      SELECT cost_price, display_price, selling_price, price
      FROM products WHERE id = $1 FOR UPDATE
    `;
    const productResult = await client.query(getProductQuery, [id]);

    if (productResult.rows.length === 0) {
      throw new Error('Product not found');
    }

    const current = productResult.rows[0];
    const prevCost = current.cost_price ? parseFloat(current.cost_price) : null;
    const prevDisplay = current.display_price ? parseFloat(current.display_price) : null;
    const prevSelling = current.selling_price
      ? parseFloat(current.selling_price)
      : current.price ? parseFloat(current.price) : null;

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

    // Validate: selling_price must not exceed display_price when both are provided
    const newSelling = sellingPrice !== undefined ? parseFloat(sellingPrice) : prevSelling;
    const newDisplay = displayPrice !== undefined ? parseFloat(displayPrice) : prevDisplay;
    if (newDisplay !== null && newSelling !== null && newSelling > newDisplay) {
      throw new Error('Selling price cannot exceed display price (MRP)');
    }

    const updateQuery = `
      UPDATE products
      SET
        cost_price              = COALESCE($1, cost_price),
        display_price           = COALESCE($2, display_price),
        selling_price           = COALESCE($3, selling_price),
        price                   = COALESCE($3, selling_price, price),
        minimum_margin_percent  = COALESCE($4, minimum_margin_percent),
        last_changed            = CURRENT_TIMESTAMP,
        changed_by              = $5,
        updated_at              = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING
        cost_price, display_price, selling_price, minimum_margin_percent;
    `;
    const updateResult = await client.query(updateQuery, [
      costPrice !== undefined ? costPrice : null,
      displayPrice !== undefined ? displayPrice : null,
      sellingPrice !== undefined ? sellingPrice : null,
      minimumMarginPercent !== undefined ? minimumMarginPercent : null,
      adminId,
      id,
    ]);

    const updated = updateResult.rows[0];
    const metrics = calcPricingMetrics(
      updated.cost_price,
      updated.display_price,
      updated.selling_price
    );

    // Audit history
    const historyQuery = `
      INSERT INTO price_history (
        product_id,
        previous_cost, new_cost,
        previous_display_price, new_display_price,
        previous_selling_price, new_selling_price,
        change_type, reason, changed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    await client.query(historyQuery, [
      id,
      prevCost, costPrice !== undefined ? costPrice : prevCost,
      prevDisplay, displayPrice !== undefined ? displayPrice : prevDisplay,
      prevSelling, sellingPrice !== undefined ? sellingPrice : prevSelling,
      'manual', reason || 'Manual update', adminId,
    ]);

    await client.query('COMMIT');

    return {
      productId: id,
      costPrice: updated.cost_price ? parseFloat(updated.cost_price) : null,
      displayPrice: updated.display_price ? parseFloat(updated.display_price) : null,
      sellingPrice: updated.selling_price ? parseFloat(updated.selling_price) : null,
      minimumMarginPercent: updated.minimum_margin_percent ? parseFloat(updated.minimum_margin_percent) : null,
      ...metrics,
      updatedBy: changedBy,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Bulk update: adjust selling_price and/or display_price by percentage or flat amount.
 * applyTo: 'selling' | 'display' | 'both'
 */
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
      const productResult = await client.query(
        'SELECT cost_price, display_price, selling_price, price FROM products WHERE id = $1 FOR UPDATE',
        [id]
      );
      if (productResult.rows.length === 0) continue;

      const cur = productResult.rows[0];
      const prevDisplay = cur.display_price ? parseFloat(cur.display_price) : null;
      const prevSelling = cur.selling_price
        ? parseFloat(cur.selling_price)
        : cur.price ? parseFloat(cur.price) : null;

      let newDisplay = prevDisplay;
      let newSelling = prevSelling;

      const applyAdjustment = (val) => {
        if (val === null) return null;
        if (adjustmentType === 'percentage') {
          return Math.max(0, val * (1 + adjustmentValue / 100));
        }
        return Math.max(0, val + adjustmentValue);
      };

      if (applyTo === 'display' || applyTo === 'both') {
        newDisplay = applyAdjustment(prevDisplay);
      }
      if (applyTo === 'selling' || applyTo === 'both' || applyTo === 'retail') {
        newSelling = applyAdjustment(prevSelling);
      }

      // Ensure selling does not exceed display
      if (newDisplay !== null && newSelling !== null && newSelling > newDisplay) {
        newSelling = newDisplay;
      }

      const changed =
        (newDisplay !== prevDisplay) || (newSelling !== prevSelling);

      if (changed) {
        await client.query(`
          UPDATE products
          SET
            display_price  = $1,
            selling_price  = $2,
            price          = $2,
            last_changed   = CURRENT_TIMESTAMP,
            changed_by     = $3,
            updated_at     = CURRENT_TIMESTAMP
          WHERE id = $4
        `, [newDisplay, newSelling, adminId, id]);

        await client.query(`
          INSERT INTO price_history (
            product_id,
            previous_cost, new_cost,
            previous_display_price, new_display_price,
            previous_selling_price, new_selling_price,
            change_type, reason, changed_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          id,
          cur.cost_price, cur.cost_price,
          prevDisplay, newDisplay,
          prevSelling, newSelling,
          'bulk', reason || 'Bulk update', adminId,
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
  const limitNum = Number.isFinite(Number(limit)) && Number(limit) > 0 ? Math.floor(Number(limit)) : 50;
  const query = `
    SELECT
      ph.previous_cost           AS "previousCost",
      ph.new_cost                AS "newCost",
      ph.previous_display_price  AS "previousDisplayPrice",
      ph.new_display_price       AS "newDisplayPrice",
      ph.previous_selling_price  AS "previousSellingPrice",
      ph.new_selling_price       AS "newSellingPrice",
      ph.change_type             AS "changeType",
      ph.reason,
      u.name                     AS "changedByName",
      ph.created_at              AS "createdAt"
    FROM price_history ph
    LEFT JOIN users u ON ph.changed_by = u.id
    WHERE ph.product_id = $1
    ORDER BY ph.created_at DESC
    LIMIT $2
  `;
  const result = await pool.query(query, [productId, limitNum]);
  return result.rows.map(row => ({
    previousCost: row.previousCost ? parseFloat(row.previousCost) : null,
    newCost: row.newCost ? parseFloat(row.newCost) : null,
    previousDisplayPrice: row.previousDisplayPrice ? parseFloat(row.previousDisplayPrice) : null,
    newDisplayPrice: row.newDisplayPrice ? parseFloat(row.newDisplayPrice) : null,
    previousSellingPrice: row.previousSellingPrice ? parseFloat(row.previousSellingPrice) : null,
    newSellingPrice: row.newSellingPrice ? parseFloat(row.newSellingPrice) : null,
    changeType: row.changeType,
    reason: row.reason,
    changedByName: row.changedByName || null,
    createdAt: row.createdAt,
  }));
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
  getPriceHistory,
  calcPricingMetrics,
  suggestSellingPrice,
};
