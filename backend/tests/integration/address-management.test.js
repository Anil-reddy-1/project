/**
 * Address Management Integration Tests
 * Tests address CRUD operations with geolocation and image support
 */

const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const { createTestUser, cleanupTestUsers } = require('../helpers/testAuth');

describe('Address Management Integration Tests', () => {
  let buyerToken;
  let buyerId;
  let addressId;
  let defaultAddressId;

  // Setup: Create test user
  beforeAll(async () => {
    const timestamp = Date.now();
    
    const buyer = await createTestUser({
      email: `test-buyer-address-${timestamp}@test.com`,
      name: 'Test Buyer',
      phone: `987654${timestamp.toString().slice(-4)}`,
      role: 'buyer'
    });
    
    buyerToken = buyer.token;
    buyerId = buyer.user.id;
  });

  // Cleanup: Remove test data
  afterAll(async () => {
    try {
      // Delete test addresses
      await pool.query('DELETE FROM user_addresses WHERE user_id = $1', [buyerId]);
      
      // Cleanup test users
      await cleanupTestUsers();
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe('POST /api/v1/addresses - Create Address', () => {
    test('should create first address and set as default', async () => {
      const addressData = {
        name: 'John Doe',
        phone: '9876543210',
        addressLine1: '123 Main Street',
        addressLine2: 'Near Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        isDefault: false // Should be forced to true for first address
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(addressData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.isDefault).toBe(true); // First address is always default
      expect(response.body.data.name).toBe(addressData.name);
      expect(response.body.data.phone).toBe(addressData.phone);
      
      defaultAddressId = response.body.data.id;
    });

    test('should create address with geolocation', async () => {
      const addressData = {
        name: 'Shop Location',
        phone: '9876543211',
        addressLine1: '456 Market Road',
        city: 'Delhi',
        state: 'Delhi',
        postalCode: '110001',
        latitude: 28.6139,
        longitude: 77.2090
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(addressData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.latitude).toBe(addressData.latitude);
      expect(response.body.data.longitude).toBe(addressData.longitude);
      
      addressId = response.body.data.id;
    });

    test('should create address with image URL', async () => {
      const addressData = {
        name: 'Shop with Image',
        phone: '9876543212',
        addressLine1: '789 Store Street',
        city: 'Bangalore',
        state: 'Karnataka',
        postalCode: '560001',
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v123/addresses/shop.jpg'
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(addressData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imageUrl).toBe(addressData.imageUrl);
    });

    test('should fail validation for missing required fields', async () => {
      const invalidData = {
        name: 'Test',
        // Missing phone, address, city, state, postalCode
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    test('should fail validation for invalid phone number', async () => {
      const invalidData = {
        name: 'Test',
        phone: '123', // Invalid phone
        addressLine1: 'Address',
        city: 'City',
        state: 'State',
        postalCode: '123456'
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Phone number must be valid (10 digits)');
    });

    test('should fail validation for invalid postal code', async () => {
      const invalidData = {
        name: 'Test',
        phone: '9876543210',
        addressLine1: 'Address',
        city: 'City',
        state: 'State',
        postalCode: '12' // Invalid postal code
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toContain('Postal code must be 6 digits');
    });

    test('should fail validation for incomplete geolocation', async () => {
      const invalidData = {
        name: 'Test',
        phone: '9876543210',
        addressLine1: 'Address',
        city: 'City',
        state: 'State',
        postalCode: '123456',
        latitude: 28.6139
        // Missing longitude
      };

      const response = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('should require authentication', async () => {
      const addressData = {
        name: 'Test',
        phone: '9876543210',
        addressLine1: 'Address',
        city: 'City',
        state: 'State',
        postalCode: '123456'
      };

      await request(app)
        .post('/api/v1/addresses')
        .send(addressData)
        .expect(401);
    });
  });

  describe('GET /api/v1/addresses - Get All Addresses', () => {
    test('should get all user addresses', async () => {
      const response = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addresses).toBeInstanceOf(Array);
      expect(response.body.data.count).toBeGreaterThan(0);
      expect(response.body.data.addresses[0]).toHaveProperty('id');
      expect(response.body.data.addresses[0]).toHaveProperty('isDefault');
    });

    test('should order addresses with default first', async () => {
      const response = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      const addresses = response.body.data.addresses;
      const defaultAddress = addresses.find(addr => addr.isDefault);
      
      expect(defaultAddress).toBeDefined();
      expect(addresses[0].isDefault).toBe(true); // Default should be first
    });
  });

  describe('GET /api/v1/addresses/:id - Get Address by ID', () => {
    test('should get specific address', async () => {
      const response = await request(app)
        .get(`/api/v1/addresses/${addressId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(addressId);
    });

    test('should return 404 for non-existent address', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/v1/addresses/${fakeId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/addresses/default - Get Default Address', () => {
    test('should get default address', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/default')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
      expect(response.body.data.id).toBe(defaultAddressId);
    });
  });

  describe('PUT /api/v1/addresses/:id - Update Address', () => {
    test('should update address fields', async () => {
      const updateData = {
        name: 'Updated Name',
        phone: '9999999999',
        city: 'Updated City'
      };

      const response = await request(app)
        .put(`/api/v1/addresses/${addressId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe(updateData.name);
      expect(response.body.data.phone).toBe(updateData.phone);
      expect(response.body.data.city).toBe(updateData.city);
    });

    test('should update geolocation', async () => {
      const updateData = {
        latitude: 19.0760,
        longitude: 72.8777
      };

      const response = await request(app)
        .put(`/api/v1/addresses/${addressId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.latitude).toBe(updateData.latitude);
      expect(response.body.data.longitude).toBe(updateData.longitude);
    });

    test('should update image URL', async () => {
      const updateData = {
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v456/addresses/updated.jpg'
      };

      const response = await request(app)
        .put(`/api/v1/addresses/${addressId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.imageUrl).toBe(updateData.imageUrl);
    });

    test('should return 404 for non-existent address', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .put(`/api/v1/addresses/${fakeId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ name: 'Test' })
        .expect(404);
    });
  });

  describe('PATCH /api/v1/addresses/:id/default - Set Default Address', () => {
    test('should set address as default', async () => {
      const response = await request(app)
        .patch(`/api/v1/addresses/${addressId}/default`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isDefault).toBe(true);
    });

    test('should unset previous default address', async () => {
      // Get all addresses
      const response = await request(app)
        .get('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      const addresses = response.body.data.addresses;
      const defaultAddresses = addresses.filter(addr => addr.isDefault);
      
      // Only one address should be default
      expect(defaultAddresses.length).toBe(1);
      expect(defaultAddresses[0].id).toBe(addressId);
    });
  });

  describe('DELETE /api/v1/addresses/:id - Delete Address', () => {
    test('should delete non-default address', async () => {
      // First, create a non-default address to delete
      const addressData = {
        name: 'To Delete',
        phone: '8888888888',
        addressLine1: 'Delete Street',
        city: 'Test City',
        state: 'Test State',
        postalCode: '123456'
      };

      const createResponse = await request(app)
        .post('/api/v1/addresses')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send(addressData)
        .expect(201);

      const deleteId = createResponse.body.data.id;

      // Delete the address
      const response = await request(app)
        .delete(`/api/v1/addresses/${deleteId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deletedAddressId).toBe(deleteId);

      // Verify address is deleted
      await request(app)
        .get(`/api/v1/addresses/${deleteId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);
    });

    test('should return 404 for non-existent address', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .delete(`/api/v1/addresses/${fakeId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(404);
    });
  });

  describe('GET /api/v1/addresses/count - Get Address Count', () => {
    test('should get address count', async () => {
      const response = await request(app)
        .get('/api/v1/addresses/count')
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBeGreaterThan(0);
      expect(typeof response.body.data.count).toBe('number');
    });
  });
});
