/**
 * Test Product Image Upload
 * Tests the complete flow of creating a product with image uploads
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const API_URL = 'http://localhost:5000/api/v1';

async function testProductImageUpload() {
  console.log('\n🧪 Testing Product Image Upload Flow...\n');

  try {
    // Create a test image buffer (1x1 PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );

    // Create form data
    const formData = new FormData();
    
    // Product data
    formData.append('sku', `TEST-${Date.now()}`);
    formData.append('name', 'Test Product with Images');
    formData.append('description', 'Testing image upload functionality');
    formData.append('price', '99.99');
    formData.append('quantity', '100');
    formData.append('unit', 'pcs');
    formData.append('minStock', '10');
    formData.append('maxStock', '500');
    formData.append('minOrderQuantity', '1');
    formData.append('status', 'active');
    formData.append('categoryTags', JSON.stringify(['test', 'sample']));
    
    // Append test image (simulate multiple images)
    formData.append('images', testImageBuffer, {
      filename: 'test-image-1.png',
      contentType: 'image/png'
    });
    formData.append('images', testImageBuffer, {
      filename: 'test-image-2.png',
      contentType: 'image/png'
    });

    console.log('📤 Sending request to create product with images...\n');
    console.log('Payload:');
    console.log('  - SKU:', formData.getBuffer().toString().match(/sku\r\n\r\n(.*?)\r\n/)?.[1]);
    console.log('  - Name:', 'Test Product with Images');
    console.log('  - Images:', '2 test images attached');
    console.log('');

    // Make the request (note: you'll need to add authentication token if required)
    const response = await axios.post(
      `${API_URL}/products`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          // Add authentication header if needed
          // 'Authorization': `Bearer YOUR_TOKEN_HERE`
        }
      }
    );

    console.log('✅ Product created successfully!\n');
    console.log('Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    const product = response.data.data;
    
    console.log('\n📊 Image Upload Summary:');
    console.log(`  - Product ID: ${product.id}`);
    console.log(`  - SKU: ${product.sku}`);
    console.log(`  - Primary Image URL: ${product.primaryImageUrl || 'NOT SET'}`);
    console.log(`  - Total Images: ${product.images?.length || 0}`);
    
    if (product.images && product.images.length > 0) {
      product.images.forEach((img, idx) => {
        console.log(`    ${idx + 1}. ${img.url}`);
        console.log(`       - Public ID: ${img.publicId}`);
        console.log(`       - Is Primary: ${img.isPrimary}`);
      });
    } else {
      console.log('  ⚠️  WARNING: No images were saved to the database!');
    }
    
    console.log('\n✅ Test completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.response) {
      console.error('\nAPI Response Error:');
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Cannot connect to API. Is the backend server running?');
      console.error('   Start it with: npm run dev (in backend directory)');
    }
    
    console.log('\n❌ Test failed!\n');
    process.exit(1);
  }
}

// Run the test
console.log('='.repeat(60));
console.log('PRODUCT IMAGE UPLOAD TEST');
console.log('='.repeat(60));

testProductImageUpload();
