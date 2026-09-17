const dotenv = require("dotenv");
dotenv.config();

const env = process.env.NODE_ENV || "development";

const config = {
  env,
  PORT: process.env.PORT || 4000,
  isDevelopment: () => env === "development",
  isProduction: () => env === "production",
  isTest: () => env === "test",
  db: {
    DB_USER_NAME: process.env.DB_USER_NAME,
    DB_HOST: process.env.DB_HOST,
    DATABASE_NAME: process.env.DATABASE_NAME,
    DB_PORT: process.env.DB_PORT,
    DB_PASS: process.env.DB_PASS,
  },
  redis: {
    REDIS_URI: process.env.REDIS_URI,
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  },
};

module.exports = config;
