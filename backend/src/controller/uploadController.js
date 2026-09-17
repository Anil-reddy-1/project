const { 
  uploadToCloudinary, 
  uploadMultipleToCloudinary, 
  deleteFromCloudinary 
} = require('../utils/imageUpload');
const logger = require('../utils/logger');

/**
 * Upload Controller
 * Handles image upload endpoints
 */

/**
 * Upload single image
 * POST /api/v1/uploads/image
 */
async function uploadSingleImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    const folder = req.body.folder || 'products';
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      }
    });
  } catch (error) {
    logger.error('Upload single image error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message
    });
  }
}

/**
 * Upload multiple images
 * POST /api/v1/uploads/images
 */
async function uploadMultipleImages(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const folder = req.body.folder || 'products';
    const fileBuffers = req.files.map(file => file.buffer);
    
    const results = await uploadMultipleToCloudinary(fileBuffers, folder);

    res.status(200).json({
      success: true,
      message: `Successfully uploaded ${results.length} images`,
      data: results.map(result => ({
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes
      }))
    });
  } catch (error) {
    logger.error('Upload multiple images error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message
    });
  }
}

/**
 * Delete image from Cloudinary
 * DELETE /api/v1/uploads/image/:publicId
 */
async function deleteImage(req, res) {
  try {
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    // Decode URL-encoded public ID
    const decodedPublicId = decodeURIComponent(publicId);
    const result = await deleteFromCloudinary(decodedPublicId);

    if (result.success) {
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully',
        data: { publicId: result.publicId }
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Image not found or already deleted',
        data: { publicId: result.publicId }
      });
    }
  } catch (error) {
    logger.error('Delete image error:', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message
    });
  }
}

module.exports = {
  uploadSingleImage,
  uploadMultipleImages,
  deleteImage
};
