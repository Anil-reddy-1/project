/**
 * Fix delivery_test@gmail.com user - create missing delivery_partners document
 */

import { adminDb, adminAuth, initializeFirebase } from '../src/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import * as geofire from 'geofire-common';

async function fixDeliveryTestUser() {
  initializeFirebase();
  const email = 'delivery_test@gmail.com';

  try {
    // Get the user
    const user = await adminAuth().getUserByEmail(email);
    const uid = user.uid;

    console.log(`Found user: ${uid}`);

    // Update custom claims to ensure role is correct
    await adminAuth().setCustomUserClaims(uid, {
      role: 'delivery_partner',
      status: 'active',
    });
    console.log('✅ Updated custom claims to delivery_partner');

    // Get shop location
    const db = adminDb();
    const shopsSnapshot = await db.collection('shops').limit(1).get();
    
    if (shopsSnapshot.empty) {
      throw new Error('No shops found!');
    }

    const shopId = shopsSnapshot.docs[0].id;
    const shopData = shopsSnapshot.docs[0].data();
    const latitude = shopData.location?.coordinates?.latitude || 37.7749;
    const longitude = shopData.location?.coordinates?.longitude || -122.4194;
    const geohash = geofire.geohashForLocation([latitude, longitude]);

    // Create or update delivery_partners document
    const partnerData = {
      uid,
      name: user.displayName || 'Test Delivery',
      email: user.email,
      phone: user.phoneNumber || '+1234567890',
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
      maxDeliveryRadius: 10,
      vehicleType: 'bike',
      vehicleNumber: 'TEST-1234',
      fcmToken: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('delivery_partners').doc(uid).set(partnerData, { merge: true });
    console.log('✅ Created/updated delivery_partners document');

    // Update users document
    await db.collection('users').doc(uid).set({
      uid,
      role: 'delivery_partner',
      status: 'active',
      name: user.displayName || 'Test Delivery',
      email: user.email,
      phone: user.phoneNumber || '+1234567890',
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('✅ Updated users document');

    console.log('\n🎉 Fixed delivery_test@gmail.com user successfully!');
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${email}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixDeliveryTestUser();
