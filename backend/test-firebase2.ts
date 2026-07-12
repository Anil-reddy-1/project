import * as dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';

async function test() {
  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    } as admin.ServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID // Try explicit projectId
    });

    console.log('Testing set...');
    const db = admin.firestore();
    
    // Explicitly set the databaseId if needed?
    // Firestore API uses `databaseId: "(default)"` internally
    
    await db.collection('test').doc('test').set({
      time: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('Success!');
  } catch (e) {
    console.error('ERROR:', e);
  }
}
test();
