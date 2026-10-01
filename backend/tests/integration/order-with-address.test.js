/**
 * Order Flow with Address Integration Tests
 * Tests complete order flow including address selection and geolocation
 */

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const { createTestUser, cleanupTestUsers } = require('../helpers/testAuth');

describe('Order Flow with Address Integration Tests', () => {
  let buyerToken;
  let buyerId;
  let productId;
  let addressId;
  let addressWithGeoId;
  let orderId;

  beforeAll(async () => {
    const timestamp = Date.now();
    
    // Create test buyer
    const buyer = await createTestUser({
      email: `test-order-buyer-${timestamp}@test.com`,
      name: 'Test Order Buyer',
      phone: `555${timestamp.toString().slice(-7)}`,
      role: 'buyer'
    });
    
    buyerToken = buyer.token;
    buyerId = buyer.user.id;

    // Create test product
    const productResult = await pool.query(`
      INSERT INTO products (name, sku, description, price, stock_quantity, moq, category, brand)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, ['Test Product', `SKU-${timestamp}`, 'Test Description', 100.00, 50, 1, 'Test', 'Test Brand']);
    
    productId = productResult.rows[0].id;
  });

  afterAll(async () => {
    try {
      // Cleanup order items first (foreign key constraint)
      await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
      
      // Cleanup order
      if (orderId) {
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
      }
      
      // Cleanup addresses
      await pool.query('DELETE FROM user_addresses WHERE user_id = $1', [buyerId]);
      
      // Cleanup cart
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [buyerId]);
      
      // Cleanup product
      await pool.query('DELETE FROM products WHERE id = $1', [productId]);
      
      // Cleanup users
      await cleanupTestUsers();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('Complete Order Flow with Address', () => {
    test('Step 1: Create delivery address', async () => {
      const addressData = {
        name: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Test Street',
        addressLine2: 'Near Test Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        isDefault: true
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(addressData)
        .expect(201);

      expect(response.body.success).toBe(true);
      addressId = response.body.data.id;
      expect(response.body.data.isDefault).toBe(true);
    });

    test('Step 2: Create address with geolocation and image', async () => {
      const addressData = {
        name: 'Shop Location',
        phone: '9876543211',
        addressLine1: '456 Market Road',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        latitude: 28.6139,
        longitude: 77.2090,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/addresses/shop123.jpg'
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(addressData)
        .expect(201);

      expect(response.body.success).toBe(true);
      addressWithGeoId = response.body.data.id;
      expect(response.body.data.latitude).toBe(addressData.latitude);
      expect(response.body.data.longitude).toBe(addressData.longitude);
      expect(response.body.data.imageUrl).toBe(addressData.imageUrl);
    });

    test('Step 3: Add product to cart', async () => {
      const cartData = {
        productId: productId,
        quantity: 5
      };

      const response = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(cartData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.product.id).toBe(productId);
      expect(response.body.data.quantity).toBe(cartData.quantity);
    });

    test('Step 4: Get cart items before checkout', async () => {
      const response = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(response.body.data.items.length).toBeGreaterThan(0);
    });

    test('Step 5: Validate order before placement', async () => {
      const validateData = {
        addressId: addressId
      };

      const response = await request(app)
        .post('/api/v1/orders/validate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(validateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isValid).toBe(true);
    });

    test('Step 6: Place order with default address', async () => {
      const orderData = {
        addressId: addressId,
        paymentMethod: 'COD',
        notes: 'Test order notes'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('orderNumber');
      expect(response.body.data.orderStatus).toBe('pending');
      expect(response.body.data.paymentMethod).toBe('COD');
      expect(response.body.data.notes).toBe(orderData.notes);
      
      orderId = response.body.data.id;
    });

    test('Step 7: Verify order contains address details', async () => {
      const response = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deliveryAddress).toBeDefined();
      expect(response.body.data.deliveryAddress.name).toBe('John Doe');
      expect(response.body.data.deliveryAddress.phone).toBe('9876543210');
      expect(response.body.data.deliveryAddress.city).toBe('Mumbai');
    });

    test('Step 8: Verify cart is cleared after order', async () => {
      const response = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.items.length).toBe(0);
    });

    test('Step 9: Place order with geolocation address', async () => {
      // Add product to cart again
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: productId, quantity: 3 })
        .expect(201);

      // Change default address to geolocation one
      await request(app)
        .patch(`/api/v1/addresses/${addressWithGeoId}/default`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      // Place order with geolocation address
      const orderData = {
        addressId: addressWithGeoId,
        paymentMethod: 'COD'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(201);

      expect(response.body.success).toBe(true);
      const geoOrderId = response.body.data.id;

      // Verify order has geolocation data
      const orderResponse = await request(app)
        .get(`/api/v1/orders/${geoOrderId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(orderResponse.body.data.deliveryAddress.latitude).toBe(28.6139);
      expect(orderResponse.body.data.deliveryAddress.longitude).toBe(77.2090);
      expect(orderResponse.body.data.deliveryAddress.imageUrl).toBeDefined();

      // Cleanup this order
      await pool.query('DELETE FROM order_items WHERE order_id = $1', [geoOrderId]);
      await pool.query('DELETE FROM orders WHERE id = $1', [geoOrderId]);
    });
  });

  describe('Order Flow Error Scenarios', () => {
    test('should fail when no address exists', async () => {
      // Create a new user with no addresses
      const timestamp = Date.now();
      const noAddressUser = await createTestUser({
        email: `no-address-${timestamp}@test.com`,
        name: 'No Address User',
        phone: `444${timestamp.toString().slice(-7)}`,
        role: 'buyer'
      });

      // Try to place order without address
      const orderData = {
        addressId: '00000000-0000-0000-0000-000000000000',
        paymentMethod: 'COD'
      };

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${noAddressUser.token}`)
        .send(orderData)
        .expect(400);
    });

    test('should fail when address does not belong to user', async () => {
      // Try to use someone else's address
      const orderData = {
        addressId: addressId, // This belongs to buyerToken user
        paymentMethod: 'COD'
      };

      // Create another user
      const timestamp = Date.now();
      const otherUser = await createTestUser({
        email: `other-user-${timestamp}@test.com`,
        name: 'Other User',
        phone: `333${timestamp.toString().slice(-7)}`,
        role: 'buyer'
      });

      await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${otherUser.token}`)
        .send(orderData)
        .expect(400);
    });

    test('should fail when cart is empty', async () => {
      // Clear cart first
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [buyerId]);

      const orderData = {
        addressId: addressId,
        paymentMethod: 'COD'
      };

      const response = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(orderData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should fail validation when product out of stock', async () => {
      // Update product stock to 0
      await pool.query('UPDATE products SET stock_quantity = 0 WHERE id = $1', [productId]);

      // Add to cart
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ productId: productId, quantity: 1 })
        .expect(201);

      // Try to validate order
      const response = await request(app)
        .post('/api/v1/orders/validate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ addressId: addressId })
        .expect(200);

      expect(response.body.data.isValid).toBe(false);
      expect(response.body.data.errors).toBeDefined();

      // Restore stock
      await pool.query('UPDATE products SET stock_quantity = 50 WHERE id = $1', [productId]);
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [buyerId]);
    });
  });

  describe('Address Selection in Order Context', () => {
    test('should get addresses for order placement', async () => {
      const response = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addresses.length).toBeGreaterThan(0);
      
      // Verify default address is first
      expect(response.body.data.addresses[0].isDefault).toBe(true);
    });

    test('should get default address for quick checkout', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/default')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
      expect(response.body.data).toHaveProperty('latitude');
      expect(response.body.data).toHaveProperty('longitude');
      expect(response.body.data).toHaveProperty('imageUrl');
    });
  });
});
