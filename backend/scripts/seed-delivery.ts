import { adminAuth, adminDb, initializeFirebase } from '../src/config/firebase';
import { FieldValue } from 'firebase-admin/firestore';

async function seedDelivery() {
  initializeFirebase();
  const email = 'delivery_test@gmail.com';
  const password = 'Password123!';
  const name = 'Test Delivery';
  const role = 'delivery_partner';

  try {
    const authUser = await adminAuth().createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });

    const uid = authUser.uid;
    await adminAuth().setCustomUserClaims(uid, { role, status: 'active' });

    const now = FieldValue.serverTimestamp();
    await adminDb().collection('users').doc(uid).set({
      uid,
      role,
      status: 'active',
      name,
      email,
      phone: '+1234567890',
      createdBy: 'seed-script',
      createdAt: now,
      updatedAt: now,
    });

    console.log(`Success! Created delivery user:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
  } catch (err: any) {
    if (err.code === 'auth/email-already-exists') {
      const user = await adminAuth().getUserByEmail(email);
      await adminAuth().updateUser(user.uid, { password });
      console.log(`User already existed. Password reset to: ${password}`);
    } else {
      console.error(err);
    }
  }
}

seedDelivery().then(() => process.exit(0));
