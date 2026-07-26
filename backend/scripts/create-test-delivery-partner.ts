/**
 * Create Test Delivery Partner
 * Quick script to set up test data for E2E testing
 */

import { adminDb, adminAuth } from '../src/config/firebase';
import * as geofire from 'geofire-common';

async function createTestDeliveryPartner() {
  try {
    console.log('🚀 Creating test delivery partner...\n');

    // 1. Create Firebase Auth user
    const email = 'testdriver@wholesalehub.com';
    const password = 'TestDriver123!';
    const name = 'Test Driver';
    const phone = '+15555551234';

    let userRecord;
    try {
      userRecord = await adminAuth().getUserByEmail(email);
      console.log('✅ User already exists:', userRecord.uid);
    } catch (error) {
      userRecord = await adminAuth().createUser({
        email,
        password,
        displayName: name,
        phoneNumber: phone,
      });
      console.log('✅ Created Firebase Auth user:', userRecord.uid);
    }

    // 2. Set custom claims
    await adminAuth().setCustomUserClaims(userRecord.uid, {
      role: 'delivery',
      status: 'active',
    });
    console.log('✅ Set custom claims: role=delivery, status=active');

    // 3. Get shop ID (assuming single shop)
    const db = adminDb();
    const shopsSnapshot = await db.collection('shops').limit(1).get();
    
    if (shopsSnapshot.empty) {
      throw new Error('No shops found! Please create a shop first.');
    }

    const shopId = shopsSnapshot.docs[0].id;
    const shopData = shopsSnapshot.docs[0].data();
    console.log('✅ Found shop:', shopData.name);

    // 4. Create location near shop (San Francisco for demo)
    const latitude = shopData.location?.latitude || 37.7749;
    const longitude = shopData.location?.longitude || -122.4194;
    const geohash = geofire.geohashForLocation([latitude, longitude]);

    // 5. Create delivery_partners document
    const partnerData = {
      uid: userRecord.uid,
      name,
      email,
      phone,
      status: 'available',
      isOnline: true,
      currentLocation: {
        latitude,
        longitude,
        geohash,
        accuracy: 50,
        updatedAt: new Date(),
      },
      maxConcurrentOrders: 2,
      currentOrderCount: 0,
      todayDeliveryCount: 0,
      totalDeliveries: 0,
      successfulDeliveries: 0,
      cancelledDeliveries: 0,
      rating: 4.5,
      shopId,
      maxDeliveryRadius: 10, // 10 km
      vehicleType: 'bike',
      vehicleNumber: 'TEST-1234',
      fcmToken: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('delivery_partners').doc(userRecord.uid).set(partnerData);
    console.log('✅ Created delivery_partners document');

    // 6. Create users document
    const userData = {
      uid: userRecord.uid,
      name,
      email,
      phone,
      role: 'delivery',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('users').doc(userRecord.uid).set(userData);
    console.log('✅ Created users document');

    // Summary
    console.log('\n🎉 Test delivery partner created successfully!\n');
    console.log('📋 Login Credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n📍 Location:');
    console.log('   Latitude:', latitude);
    console.log('   Longitude:', longitude);
    console.log('   Near shop:', shopData.name);
    console.log('\n🔗 Test URL: http://localhost:3000/delivery\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestDeliveryPartner();
