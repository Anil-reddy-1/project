/**
 * Firebase Admin SDK initialization
 * Singleton pattern ensures single instance across the app
 */

const admin = require('firebase-admin');
const config = require('./env');
const logger = require('../utils/logger');

let firebaseApp = null;

function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (admin.apps.length > 0) {
    firebaseApp = admin.app();
    return firebaseApp;
  }

  try {
    const { projectId, clientEmail, privateKey, databaseURL, storageBucket, serviceAccountJson } = config.firebase;

    // 1. Check if Service Account JSON is provided directly in ENV
    if (serviceAccountJson) {
      try {
        const serviceAccount = typeof serviceAccountJson === 'string'
          ? JSON.parse(serviceAccountJson)
          : serviceAccountJson;

        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL,
          storageBucket,
        });
        logger.info('Firebase Admin SDK initialized successfully via Service Account JSON');
        return firebaseApp;
      } catch (err) {
        logger.error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON format', { error: err.message });
      }
    }

    // 2. Check for individual environment variables
    const formattedPrivateKey = privateKey ? privateKey.replace(/\\n/g, '\n') : undefined;
    const hasValidPrivateKey = formattedPrivateKey &&
      formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----') &&
      !formattedPrivateKey.includes('YOUR_PRIVATE_KEY_HERE');

    if (projectId && clientEmail && hasValidPrivateKey) {
      const serviceAccount = {
        type: 'service_account',
        project_id: projectId,
        private_key: formattedPrivateKey,
        client_email: clientEmail,
      };

      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL,
        storageBucket,
      });

      logger.info('Firebase Admin SDK initialized successfully');
      return firebaseApp;
    }

    // 3. Check for Google Application Default Credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL,
        storageBucket,
      });
      logger.info('Firebase Admin SDK initialized via Application Default Credentials');
      return firebaseApp;
    }

    // 4. Handle missing credentials
    if (config.isDevelopment() || config.isTest()) {
      logger.warn('Firebase credentials not configured. Running without Firebase.');
      return null;
    }

    throw new Error('Firebase credentials are required in production environment');
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error: error.message });
    if (config.isDevelopment() || config.isTest()) {
      return null;
    }
    throw error;
  }
}

// Get Auth instance
function getAuth() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return firebaseApp ? admin.auth() : null;
}



module.exports = {
  initializeFirebase,
  getAuth,
  get auth() {
    return getAuth();
  },
};
