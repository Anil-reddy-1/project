const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * Cloudinary Configuration
 * Setup and export configured Cloudinary instance
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Test connection on startup
const testConnection = async () => {
  try {
    await cloudinary.api.ping();
    logger.info('✅ Cloudinary connection established successfully');
  } catch (error) {
    logger.error('❌ Cloudinary connection failed:', { error: error.message });
  }
};

testConnection();

module.exports = cloudinary;
