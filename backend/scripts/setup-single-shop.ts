/**
 * Single Shop Setup Script
 * Phase 2.5 Migration - Single Shop Architecture
 * 
 * Creates the initial admin, wholesaler, and shop for the system.
 * This script is idempotent - safe to run multiple times.
 * 
 * Usage:
 *   npx ts-node scripts/setup-single-shop.ts
 */

import 'dotenv/config';
import * as admin from 'firebase-admin';
import * as bcrypt from 'bcryptjs';
import * as geofire from 'geofire-common';

// Initialize Firebase Admin using environment variables (same as main app)
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
    console.error('❌ Missing Firebase environment variables.');
    console.error('Please ensure .env file has:');
    console.error('  - FIREBASE_PROJECT_ID');
    console.error('  - FIREBASE_CLIENT_EMAIL');
    console.error('  - FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
  
  console.log('✅ Firebase Admin initialized with environment credentials');
}

const db = admin.firestore();
const auth = admin.auth();

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  admin: {
    email: 'admin@wholesaleplatform.com',
    password: 'Admin@123',
    name: 'System Administrator',
    phone: '+919876543210',
  },
  wholesaler: {
    email: 'wholesaler@business.com',
    password: 'Wholesaler@123',
    name: 'Wholesale Business Owner',
    phone: '+919876543211',
  },
  shop: {
    name: 'Wholesale Mart',
    address: '123 Business District, Mumbai, Maharashtra 400001',
    phone: '+919876543211',
    category: 'General Wholesale',
    lat: 19.0760, // Mumbai coordinates (example)
    lng: 72.8777,
    operatingHours: {
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      open: '09:00',
      close: '18:00',
    },
    moqThreshold: 5000, // Minimum order value in INR
  },
};

/**
 * Create or get admin user
 */
async function setupAdmin(): Promise<string> {
  console.log('\n📋 Setting up Admin...');

  try {
    // Check if admin exists
    const usersSnapshot = await db
      .collection('users')
      .where('role', '==', 'admin')
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      const adminDoc = usersSnapshot.docs[0];
      console.log('✅ Admin already exists:', adminDoc.id);
      return adminDoc.id;
    }

    // Create admin in Firebase Auth
    let adminUser: admin.auth.UserRecord;
    try {
      adminUser = await auth.getUserByEmail(CONFIG.admin.email);
      console.log('ℹ️  Admin auth account exists:', adminUser.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        adminUser = await auth.createUser({
          email: CONFIG.admin.email,
          password: CONFIG.admin.password,
          displayName: CONFIG.admin.name,
          phoneNumber: CONFIG.admin.phone,
        });
        console.log('✅ Created admin auth account:', adminUser.uid);
      } else {
        throw error;
      }
    }

    // Set custom claims
    await auth.setCustomUserClaims(adminUser.uid, {
      role: 'admin',
      status: 'active',
    });

    // Create admin document in Firestore
    await db
      .collection('users')
      .doc(adminUser.uid)
      .set({
        uid: adminUser.uid,
        role: 'admin',
        status: 'active',
        name: CONFIG.admin.name,
        email: CONFIG.admin.email,
        phone: CONFIG.admin.phone,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Admin setup complete');
    return adminUser.uid;
  } catch (error) {
    console.error('❌ Failed to setup admin:', error);
    throw error;
  }
}

/**
 * Create or get wholesaler user
 */
async function setupWholesaler(adminUid: string): Promise<string> {
  console.log('\n📋 Setting up Wholesaler...');

  try {
    // Check if wholesaler exists
    const usersSnapshot = await db
      .collection('users')
      .where('role', '==', 'wholesaler')
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      const wholesalerDoc = usersSnapshot.docs[0];
      console.log('✅ Wholesaler already exists:', wholesalerDoc.id);
      return wholesalerDoc.id;
    }

    // Create wholesaler in Firebase Auth
    let wholesalerUser: admin.auth.UserRecord;
    try {
      wholesalerUser = await auth.getUserByEmail(CONFIG.wholesaler.email);
      console.log('ℹ️  Wholesaler auth account exists:', wholesalerUser.uid);
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        wholesalerUser = await auth.createUser({
          email: CONFIG.wholesaler.email,
          password: CONFIG.wholesaler.password,
          displayName: CONFIG.wholesaler.name,
          phoneNumber: CONFIG.wholesaler.phone,
        });
        console.log('✅ Created wholesaler auth account:', wholesalerUser.uid);
      } else {
        throw error;
      }
    }

    // Set custom claims
    await auth.setCustomUserClaims(wholesalerUser.uid, {
      role: 'wholesaler',
      status: 'active',
    });

    // Create wholesaler document in Firestore (shopId will be added later)
    await db
      .collection('users')
      .doc(wholesalerUser.uid)
      .set({
        uid: wholesalerUser.uid,
        role: 'wholesaler',
        status: 'active',
        name: CONFIG.wholesaler.name,
        email: CONFIG.wholesaler.email,
        phone: CONFIG.wholesaler.phone,
        createdBy: adminUid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    console.log('✅ Wholesaler setup complete');
    return wholesalerUser.uid;
  } catch (error) {
    console.error('❌ Failed to setup wholesaler:', error);
    throw error;
  }
}

/**
 * Create or get shop
 */
async function setupShop(wholesalerUid: string): Promise<string> {
  console.log('\n📋 Setting up Shop...');

  try {
    // Check if shop exists
    const shopsSnapshot = await db.collection('shops').limit(1).get();

    if (!shopsSnapshot.empty) {
      const shopDoc = shopsSnapshot.docs[0];
      console.log('✅ Shop already exists:', shopDoc.id);
      await shopDoc.ref.update({
        ownerUid: wholesalerUid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection('users').doc(wholesalerUid).update({
        shopId: shopDoc.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Wholesaler linked to existing shop');
      return shopDoc.id;
    }

    // Calculate geohash
    const geohash = geofire.geohashForLocation([CONFIG.shop.lat, CONFIG.shop.lng]);

    // Create shop document
    const shopRef = db.collection('shops').doc();
    await shopRef.set({
      shopId: shopRef.id,
      ownerUid: wholesalerUid,
      name: CONFIG.shop.name,
      address: CONFIG.shop.address,
      phone: CONFIG.shop.phone,
      category: CONFIG.shop.category,
      geopoint: new admin.firestore.GeoPoint(CONFIG.shop.lat, CONFIG.shop.lng),
      geohash: geohash,
      operatingHours: CONFIG.shop.operatingHours,
      moqThreshold: CONFIG.shop.moqThreshold,
      verificationStatus: 'verified', // Single shop is always verified
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Shop created:', shopRef.id);

    // Update wholesaler document with shopId
    await db.collection('users').doc(wholesalerUid).update({
      shopId: shopRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Wholesaler linked to shop');

    return shopRef.id;
  } catch (error) {
    console.error('❌ Failed to setup shop:', error);
    throw error;
  }
}

/**
 * Verify setup
 */
async function verifySetup(adminUid: string, wholesalerUid: string, shopId: string): Promise<void> {
  console.log('\n📋 Verifying setup...');

  try {
    // Check admin
    const adminDoc = await db.collection('users').doc(adminUid).get();
    console.log('✅ Admin verified:', adminDoc.exists);

    // Check wholesaler
    const wholesalerDoc = await db.collection('users').doc(wholesalerUid).get();
    console.log('✅ Wholesaler verified:', wholesalerDoc.exists);
    console.log('   - shopId:', wholesalerDoc.data()?.shopId);

    // Check shop
    const shopDoc = await db.collection('shops').doc(shopId).get();
    console.log('✅ Shop verified:', shopDoc.exists);
    console.log('   - ownerUid:', shopDoc.data()?.ownerUid);

    // Count total shops (should be 1)
    const shopsSnapshot = await db.collection('shops').get();
    console.log('✅ Total shops in system:', shopsSnapshot.size);

    // Count total wholesalers (should be 1)
    const wholesalersSnapshot = await db
      .collection('users')
      .where('role', '==', 'wholesaler')
      .get();
    console.log('✅ Total wholesalers in system:', wholesalersSnapshot.size);

    console.log('\n✅ Setup verification complete');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

/**
 * Main setup function
 */
async function main(): Promise<void> {
  console.log('🚀 Starting Single Shop Setup...');
  console.log('====================================');

  try {
    // Setup admin
    const adminUid = await setupAdmin();

    // Setup wholesaler
    const wholesalerUid = await setupWholesaler(adminUid);

    // Setup shop
    const shopId = await setupShop(wholesalerUid);

    // Verify
    await verifySetup(adminUid, wholesalerUid, shopId);

    console.log('\n====================================');
    console.log('✅ Single Shop Setup Complete!');
    console.log('====================================');
    console.log('\nCredentials:');
    console.log('------------');
    console.log('Admin:');
    console.log(`  Email: ${CONFIG.admin.email}`);
    console.log(`  Password: ${CONFIG.admin.password}`);
    console.log('\nWholesaler:');
    console.log(`  Email: ${CONFIG.wholesaler.email}`);
    console.log(`  Password: ${CONFIG.wholesaler.password}`);
    console.log('\nShop ID:', shopId);
    console.log('\n⚠️  Please change these passwords after first login!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run setup
main();
