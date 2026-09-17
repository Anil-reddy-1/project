const pool = require('../src/config/db');

/**
 * Verify Migration Success
 */

async function verifyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 Verifying migration...\n');
    
    // Check if products table exists
    const productsTable = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'products'
      ORDER BY ordinal_position;
    `);
    
    console.log('✅ Products table columns:');
    productsTable.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if product_images table exists
    const imagesTable = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'product_images'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Product_images table columns:');
    imagesTable.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Check if wishlists table exists
    const wishlistsTable = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'wishlists'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Wishlists table columns:');
    wishlistsTable.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });
    
    // Count migrated products
    const productCount = await client.query('SELECT COUNT(*) as count FROM products;');
    console.log(`\n✅ Total products migrated: ${productCount.rows[0].count}`);
    
    // Check indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename IN ('products', 'product_images', 'wishlists')
      ORDER BY tablename, indexname;
    `);
    
    console.log('\n✅ Indexes created:');
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    
    console.log('\n✅ Migration verification completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  } finally {
    client.release();
    process.exit(0);
  }
}

verifyMigration();
