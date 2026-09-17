const cloudinary = require('../config/cloudinary');
const { Readable } = require('stream');
const logger = require('./logger');

/**
 * Image Upload Utilities
 * Helper functions for Cloudinary image operations
 */

/**
 * Upload a single image to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {string} folder - Cloudinary folder name (e.g., 'products', 'products/thumbnails')
 * @param {string} publicId - Optional custom public ID
 * @returns {Promise<Object>} - Cloudinary upload result
 */
async function uploadToCloudinary(fileBuffer, folder = 'products', publicId = null) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          logger.error('Cloudinary upload error:', { error: error.message });
          return reject(new Error(`Image upload failed: ${error.message}`));
        }
        
        logger.info('Image uploaded to Cloudinary:', { 
          publicId: result.public_id, 
          url: result.secure_url 
        });
        
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes
        });
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const bufferStream = Readable.from(fileBuffer);
    bufferStream.pipe(uploadStream);
  });
}

/**
 * Upload multiple images to Cloudinary
 * @param {Array<Buffer>} fileBuffers - Array of file buffers
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array<Object>>} - Array of upload results
 */
async function uploadMultipleToCloudinary(fileBuffers, folder = 'products') {
  try {
    const uploadPromises = fileBuffers.map(buffer => 
      uploadToCloudinary(buffer, folder)
    );
    
    const results = await Promise.all(uploadPromises);
    logger.info(`Successfully uploaded ${results.length} images to Cloudinary`);
    
    return results;
  } catch (error) {
    logger.error('Multiple image upload error:', { error: error.message });
    throw new Error(`Failed to upload multiple images: ${error.message}`);
  }
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      logger.info('Image deleted from Cloudinary:', { publicId });
      return { success: true, publicId };
    } else {
      logger.warn('Image deletion failed or not found:', { publicId, result });
      return { success: false, publicId, message: result.result };
    }
  } catch (error) {
    logger.error('Cloudinary deletion error:', { error: error.message, publicId });
    throw new Error(`Image deletion failed: ${error.message}`);
  }
}

/**
 * Delete multiple images from Cloudinary
 * @param {Array<string>} publicIds - Array of Cloudinary public IDs
 * @returns {Promise<Object>} - Deletion results summary
 */
async function deleteMultipleFromCloudinary(publicIds) {
  try {
    const deletePromises = publicIds.map(publicId => 
      deleteFromCloudinary(publicId).catch(err => ({ 
        success: false, 
        publicId, 
        error: err.message 
      }))
    );
    
    const results = await Promise.all(deletePromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    logger.info(`Batch deletion complete: ${successful} successful, ${failed} failed`);
    
    return {
      total: publicIds.length,
      successful,
      failed,
      results
    };
  } catch (error) {
    logger.error('Multiple image deletion error:', { error: error.message });
    throw new Error(`Failed to delete multiple images: ${error.message}`);
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary URL
 * @returns {string|null} - Extracted public ID or null
 */
function extractPublicId(url) {
  try {
    // Match pattern: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-z]+$/);
    return match ? match[1] : null;
  } catch (error) {
    logger.error('Failed to extract public ID from URL:', { url, error: error.message });
    return null;
  }
}

/**
 * Generate a thumbnail URL from Cloudinary public ID
 * @param {string} publicId - Cloudinary public ID
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} - Thumbnail URL
 */
function generateThumbnailUrl(publicId, width = 200, height = 200) {
  return cloudinary.url(publicId, {
    transformation: [
      { width, height, crop: 'fill', gravity: 'auto' },
      { quality: 'auto' },
      { fetch_format: 'auto' }
    ]
  });
}

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
  extractPublicId,
  generateThumbnailUrl
};
