import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
import admin from "firebase-admin";

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();

async function check() {
  try {
    console.log("Checking Firestore connection...");
    await db.collection("users").limit(1).get();
    console.log("Firestore database exists and is accessible!");
  } catch (err: any) {
    console.error("Firestore Error:", err.message);
  }
}

check()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
