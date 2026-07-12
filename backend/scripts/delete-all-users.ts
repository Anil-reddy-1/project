import * as dotenv from "dotenv";
import * as path from "path";

// Load .env before anything else
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import admin from "firebase-admin";

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error("ERROR: Firebase Admin SDK credentials missing in .env");
  process.exit(1);
}

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function deleteAllUsers() {
  console.log("\n[delete-all-users] Starting to delete all users from Firebase Auth...");
  
  let hasMore = true;
  let pageToken: string | undefined = undefined;
  let authDeletedCount = 0;

  while (hasMore) {
    const listUsersResult = await auth.listUsers(1000, pageToken);
    
    if (listUsersResult.users.length > 0) {
      const uids = listUsersResult.users.map((u) => u.uid);
      const deleteResult = await auth.deleteUsers(uids);
      authDeletedCount += deleteResult.successCount;
      console.log(`[delete-all-users] Deleted ${deleteResult.successCount} users from Auth in this batch. (Errors: ${deleteResult.failureCount})`);
    }

    if (listUsersResult.pageToken) {
      pageToken = listUsersResult.pageToken;
    } else {
      hasMore = false;
    }
  }
  console.log(`[delete-all-users] Finished deleting ${authDeletedCount} total users from Firebase Auth.`);

  console.log("\n[delete-all-users] Starting to delete all users from Firestore ('users' collection)...");
  
  const usersSnapshot = await db.collection("users").get();
  
  if (usersSnapshot.empty) {
    console.log("[delete-all-users] No documents found in Firestore 'users' collection.");
  } else {
    // Delete in batches of 500 (Firestore limit)
    let batch = db.batch();
    let batchCount = 0;
    let totalDeleted = 0;

    for (const doc of usersSnapshot.docs) {
      batch.delete(doc.ref);
      batchCount++;
      totalDeleted++;

      if (batchCount === 500) {
        await batch.commit();
        console.log(`[delete-all-users] Committed batch of 500 Firestore deletes.`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
      console.log(`[delete-all-users] Committed final batch of ${batchCount} Firestore deletes.`);
    }
    
    console.log(`[delete-all-users] Finished deleting ${totalDeleted} total documents from Firestore 'users' collection.`);
  }
  console.log("\n[delete-all-users] All previous users have been deleted successfully!\n");
}

deleteAllUsers()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n[delete-all-users] FATAL ERROR:", err);
    process.exit(1);
  });
