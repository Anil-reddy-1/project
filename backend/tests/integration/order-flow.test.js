/**
 * Order Flow Integration Tests
 * Tests the complete order-to-delivery workflow
 */

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const { createTestUser, cleanupTestUsers } = require('../helpers/testAuth');

describe('Order Flow Integration Tests', () => {
  let buyerToken;
  let adminToken;
  let deliveryPartnerToken;
  let buyerId;
  let adminId;
  let deliveryPartnerId;
  let productId;
  let addressId;
  let orderId;
  let deliveryId;

  // Setup: Create test users, products, and data
  beforeAll(async () => {
    // Use timestamp to ensure unique emails
    const timestamp = Date.now();
    
    // Create test buyer
    const buyer = await createTestUser({
      email: `test-buyer-${timestamp}@test.com`,
      name: 'Test Buyer',
      phone: `123456${timestamp.toString().slice(-4)}`,
      role: 'buyer'
    });
    
    buyerToken = buyer.token;
    buyerId = buyer.user.id;

    // Create test admin
    const admin = await createTestUser({
      email: `test-admin-${timestamp}@test.com`,
      name: 'Test Admin',
      phone: `123456${(timestamp + 1).toString().slice(-4)}`,
      role: 'admin'
    });
    
    adminToken = admin.token;
    adminId = admin.user.id;

    // Create test delivery partner
    const partner = await createTestUser({
      email: `test-delivery-${timestamp}@test.com`,
      name: 'Test Partner',
      phone: `123456${(timestamp + 2).toString().slice(-4)}`,
      role: 'delivery'
    });
    
    deliveryPartnerToken = partner.token;
    deliveryPartnerId = partner.user.id;

    // Create test product
    const productQuery = `
      INSERT INTO products (name, sku, description, category_tags, quantity, price, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const productResult = await pool.query(productQuery, [
      'Test Product',
      `TEST-SKU-${timestamp}`,
      'Test Description',
      JSON.stringify(['Test Category']), // category_tags is JSONB array
      100,
      999.99,
      'active'
    ]);
    productId = productResult.rows[0].id;

    // Create test address
    const addressRes = await request(app)
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${buyerToken}`)
      .send({
        name: 'Test Address',
        phone: '1234567890',
        addressLine1: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456', // 6 digits as required
        isDefault: true
      });
    
    // Debug: log response if creation failed
    if (!addressRes.body.success) {
      console.error('Address creation failed:', JSON.stringify(addressRes.body, null, 2));
      throw new Error(`Address creation failed: ${addressRes.body.message || 'Unknown error'}. Errors: ${JSON.stringify(addressRes.body.errors || [])}`);
    }
    
    addressId = addressRes.body.data.id;
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    try {
      // Delete test data in correct order (respect foreign keys)
      if (deliveryId) {
        await pool.query('DELETE FROM delivery_status_history WHERE delivery_id = $1', [deliveryId]);
        await pool.query('DELETE FROM deliveries WHERE id = $1', [deliveryId]);
      }
      if (productId) {
        await pool.query('DELETE FROM stock_transactions WHERE product_id = $1', [productId]);
      }
      if (orderId) {
        await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
        await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
      }
      if (buyerId) {
        await pool.query('DELETE FROM cart_items WHERE user_id = $1', [buyerId]);
      }
      if (addressId) {
        await pool.query('DELETE FROM user_addresses WHERE id = $1', [addressId]);
      }
      if (productId) {
        await pool.query('DELETE FROM products WHERE id = $1', [productId]);
      }
      
      // Delete test users
      await cleanupTestUsers([buyerId, adminId, deliveryPartnerId]);
    } catch (error) {
      console.error('Cleanup error:', error.message);
    }
  });

  describe('Complete Order Flow', () => {
    test('1. Buyer adds product to cart', async () => {
      const res = await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: productId,
          quantity: 2
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quantity).toBe(2); // Response is data: result, not data.cartItem
    });

    test('2. Buyer validates order before checkout', async () => {
      const res = await request(app)
        .post('/api/v1/orders/validate')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          addressId: addressId
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.valid).toBe(true);
    });

    test('3. Buyer places order from cart', async () => {
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          addressId: addressId,
          paymentMethod: 'COD',
          notes: 'Test order notes'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.order).toHaveProperty('id');
      expect(res.body.data.order.orderStatus).toBe('confirmed');
      expect(res.body.data.order.totalAmount).toBe(1999.98); // 2 * 999.99
      
      orderId = res.body.data.order.id;
    });

    test('4. Stock is deducted after order placement', async () => {
      const productQuery = 'SELECT quantity FROM products WHERE id = $1';
      const result = await pool.query(productQuery, [productId]);
      
      expect(Number(result.rows[0].quantity)).toBe(98); // 100 - 2 (BIGINT returns as string)
    });

    test('5. Cart is cleared after order placement', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });

    test('6. Delivery record is auto-created', async () => {
      const deliveryQuery = 'SELECT * FROM deliveries WHERE order_id = $1';
      const result = await pool.query(deliveryQuery, [orderId]);
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].status).toBe('pending');
      
      deliveryId = result.rows[0].id;
    });

    test('7. Admin assigns delivery to partner', async () => {
      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerId: deliveryPartnerId, // API expects 'partnerId', not 'deliveryPartnerId'
          notes: 'Urgent delivery'
        });

      if (res.status !== 200) {
        console.error('Assignment failed:', JSON.stringify(res.body, null, 2));
        console.error('DeliveryId:', deliveryId);
        console.error('PartnerId:', deliveryPartnerId);
      } else {
        console.log('Assignment succeeded:', JSON.stringify({
          deliveryStatus: res.body.data?.delivery?.status,
          deliveryPartnerId: res.body.data?.delivery?.deliveryPartnerId
        }, null, 2));
      }

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.delivery.status).toBe('assigned');
    });

    test('8. Order status updates to assigned', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      // Debug: Check actual order status
      console.log('Order after assignment:', JSON.stringify({
        orderStatus: res.body.data?.order?.orderStatus,
        orderId: orderId
      }, null, 2));

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('assigned');
    });

    test('9. Partner accepts delivery', async () => {
      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/accept`)
        .set('Authorization', `Bearer ${deliveryPartnerToken}`)
        .send({
          notes: 'Accepted and ready to deliver'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.delivery.status).toBe('accepted');
    });

    test('10. Partner starts delivery', async () => {
      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/start`)
        .set('Authorization', `Bearer ${deliveryPartnerToken}`)
        .send({
          notes: 'Out for delivery'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.delivery.status).toBe('in_transit');
    });

    test('11. Partner completes delivery', async () => {
      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/complete`)
        .set('Authorization', `Bearer ${deliveryPartnerToken}`)
        .send({
          notes: 'Delivered successfully'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.delivery.status).toBe('delivered');
    });

    test('12. Order status updates to delivered', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.order.orderStatus).toBe('delivered');
    });

    test('13. Delivery status history is tracked', async () => {
      const historyQuery = 'SELECT * FROM delivery_status_history WHERE delivery_id = $1 ORDER BY created_at';
      const result = await pool.query(historyQuery, [deliveryId]);
      
      expect(result.rows.length).toBeGreaterThanOrEqual(4); // assigned, accepted, in_transit, delivered
      expect(result.rows[0].status).toBe('assigned');
      expect(result.rows[result.rows.length - 1].status).toBe('delivered');
    });
  });

  describe('Error Handling', () => {
    test('Cannot place order with out-of-stock product', async () => {
      // Update product to have 0 stock
      await pool.query('UPDATE products SET quantity = 0 WHERE id = $1', [productId]);
      
      // Add to cart
      await request(app)
        .post('/api/v1/cart')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          productId: productId,
          quantity: 1
        });

      // Try to place order
      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          addressId: addressId,
          paymentMethod: 'COD'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      
      // Restore stock
      await pool.query('UPDATE products SET quantity = 100 WHERE id = $1', [productId]);
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', [buyerId]);
    });

    test('Cannot assign delivery to non-existent partner', async () => {
      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/assign`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          partnerId: '00000000-0000-0000-0000-000000000000'
        });

      expect(res.status).toBe(400); // API returns 400 for validation, not 404
      expect(res.body.success).toBe(false);
    });

    test('Partner cannot update other partner\'s delivery', async () => {
      // Create another delivery partner
      const timestamp = Date.now();
      const otherPartner = await createTestUser({
        email: `other-partner-${timestamp}@test.com`,
        name: 'Other Partner',
        phone: `999999${timestamp.toString().slice(-4)}`,
        role: 'delivery'
      });

      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/accept`)
        .set('Authorization', `Bearer ${otherPartner.token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      
      // Cleanup
      await pool.query('DELETE FROM users WHERE id = $1', [otherPartner.user.id]);
    });
  });
});
