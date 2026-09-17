require('dotenv').config();
const productModel = require('../src/models/productModel');
const wishlistModel = require('../src/models/wishlistModel');

/**
 * Test Product and Wishlist Models
 */

async function testModels() {
  console.log('\n🧪 Testing Product and Wishlist Models...\n');
  
  try {
    // Test 1: Get product stats
    console.log('1️⃣  Testing getProductStats...');
    const stats = await productModel.getProductStats();
    console.log('   Stats:', stats);
    
    // Test 2: Get all category tags
    console.log('\n2️⃣  Testing getAllCategoryTags...');
    const tags = await productModel.getAllCategoryTags();
    console.log('   Category Tags:', tags);
    
    // Test 3: Find all products with filters
    console.log('\n3️⃣  Testing findAllProducts...');
    const products = await productModel.findAllProducts({
      page: 1,
      limit: 5,
      status: 'active'
    });
    console.log(`   Found ${products.items.length} products (Total: ${products.pagination.total})`);
    if (products.items.length > 0) {
      console.log('   First product:', {
        id: products.items[0].id,
        sku: products.items[0].sku,
        name: products.items[0].name,
        price: products.items[0].price,
        quantity: products.items[0].quantity,
        stockStatus: products.items[0].stockStatus
      });
    }
    
    // Test 4: Get low stock products
    console.log('\n4️⃣  Testing getLowStockProducts...');
    const lowStock = await productModel.getLowStockProducts();
    console.log(`   Low stock products: ${lowStock.length}`);
    
    // Test 5: Create a test product
    console.log('\n5️⃣  Testing createProduct...');
    const testProduct = {
      sku: `TEST-${Date.now()}`,
      name: 'Test Product',
      description: 'This is a test product',
      categoryTags: ['Electronics', 'Testing'],
      quantity: 50,
      unit: 'pcs',
      minStock: 10,
      maxStock: 100,
      minOrderQuantity: 1,
      price: 99.99,
      status: 'active'
    };
    
    const createdProduct = await productModel.createProduct(testProduct, []);
    console.log('   Created product:', {
      id: createdProduct.id,
      sku: createdProduct.sku,
      name: createdProduct.name
    });
    
    // Test 6: Update product
    console.log('\n6️⃣  Testing updateProduct...');
    const updatedProduct = await productModel.updateProduct(createdProduct.id, {
      price: 89.99,
      quantity: 45
    });
    console.log('   Updated product price:', updatedProduct.price);
    console.log('   Updated product quantity:', updatedProduct.quantity);
    
    // Test 7: Find product by ID
    console.log('\n7️⃣  Testing findProductById...');
    const foundProduct = await productModel.findProductById(createdProduct.id);
    console.log('   Found product:', foundProduct ? 'Yes' : 'No');
    
    // Test 8: Find product by SKU
    console.log('\n8️⃣  Testing findProductBySku...');
    const foundBySku = await productModel.findProductBySku(createdProduct.sku);
    console.log('   Found by SKU:', foundBySku ? 'Yes' : 'No');
    
    // Test 9: Soft delete product
    console.log('\n9️⃣  Testing deleteProduct (soft delete)...');
    const deletedProduct = await productModel.deleteProduct(createdProduct.id);
    console.log('   Product status after delete:', deletedProduct.status);
    
    // Test 10: Hard delete product (cleanup)
    console.log('\n🔟 Testing hardDeleteProduct (cleanup)...');
    await productModel.hardDeleteProduct(createdProduct.id);
    console.log('   Test product cleaned up');
    
    // Test 11: Wishlist operations (requires a user ID - skip if no users)
    console.log('\n1️⃣1️⃣  Testing wishlist operations...');
    console.log('   Skipped - requires user ID from database');
    
    console.log('\n✅ All model tests completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Model test failed:');
    console.error('   Error:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testModels();
