/**
 * Order Flow Integration Tests
 * Tests the complete order-to-delivery workflow
 */

const request = require('supertest');
const app = require('../../src/index');
const pool = require('../../src/config/db');

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
    // Create test buyer
    const buyerRes = await request(app)
      .post('/api/v1/signup')
      .send({
        email: 'test-buyer@test.com',
        password: 'Test123!@#',
        name: 'Test Buyer',
        phone: '1234567890',
        role: 'buyer'
      });
    
    buyerToken = buyerRes.body.data.token;
    buyerId = buyerRes.body.data.user.id;

    // Create test admin
    const adminRes = await request(app)
      .post('/api/v1/signup')
      .send({
        email: 'test-admin@test.com',
        password: 'Test123!@#',
        name: 'Test Admin',
        phone: '1234567891',
        role: 'admin'
      });
    
    adminToken = adminRes.body.data.token;
    adminId = adminRes.body.data.user.id;

    // Create test delivery partner
    const partnerRes = await request(app)
      .post('/api/v1/signup')
      .send({
        email: 'test-delivery@test.com',
        password: 'Test123!@#',
        name: 'Test Partner',
        phone: '1234567892',
        role: 'delivery'
      });
    
    deliveryPartnerToken = partnerRes.body.data.token;
    deliveryPartnerId = partnerRes.body.data.user.id;

    // Create test product
    const productQuery = `
      INSERT INTO products (name, sku, description, category, quantity, price, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `;
    const productResult = await pool.query(productQuery, [
      'Test Product',
      'TEST-SKU-001',
      'Test Description',
      'Test Category',
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
        postalCode: '12345',
        isDefault: true
      });
    
    addressId = addressRes.body.data.address.id;
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    // Delete test data in correct order (respect foreign keys)
    await pool.query('DELETE FROM delivery_status_history WHERE delivery_id = $1', [deliveryId]);
    await pool.query('DELETE FROM stock_transactions WHERE product_id = $1', [productId]);
    await pool.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
    await pool.query('DELETE FROM deliveries WHERE id = $1', [deliveryId]);
    await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    await pool.query('DELETE FROM cart_items WHERE user_id = $1', [buyerId]);
    await pool.query('DELETE FROM user_addresses WHERE id = $1', [addressId]);
    await pool.query('DELETE FROM products WHERE id = $1', [productId]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2, $3)', [buyerId, adminId, deliveryPartnerId]);
    
    await pool.end();
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
      expect(res.body.data.cartItem.quantity).toBe(2);
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
      
      expect(result.rows[0].quantity).toBe(98); // 100 - 2
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
          deliveryPartnerId: deliveryPartnerId,
          notes: 'Urgent delivery'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.delivery.status).toBe('assigned');
    });

    test('8. Order status updates to assigned', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderId}`)
        .set('Authorization', `Bearer ${buyerToken}`);

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
          deliveryPartnerId: '00000000-0000-0000-0000-000000000000'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    test('Partner cannot update other partner\'s delivery', async () => {
      // Create another delivery partner
      const otherPartner = await request(app)
        .post('/api/v1/signup')
        .send({
          email: 'other-partner@test.com',
          password: 'Test123!@#',
          name: 'Other Partner',
          phone: '1234567893',
          role: 'delivery'
        });

      const res = await request(app)
        .post(`/api/v1/deliveries/${deliveryId}/accept`)
        .set('Authorization', `Bearer ${otherPartner.body.data.token}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      
      // Cleanup
      await pool.query('DELETE FROM users WHERE email = $1', ['other-partner@test.com']);
    });
  });
});
