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

const auth = admin.auth();

async function testSessionCookie() {
  // We can't generate a session cookie without an ID token,
  // but we can generate a custom token and exchange it? No.
  
  // Let's just create an ID token for the user?
  // We can't create an ID token from admin SDK.
  
  // We will just read the user's custom claims using admin SDK again to be 100% sure.
  const user = await auth.getUserByEmail("anilreddy5251@gmail.com");
  console.log("User UID:", user.uid);
  console.log("User Claims:", user.customClaims);
}

testSessionCookie()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
