const express = require('express');
const router = express.Router();
const { uploadSingleImage, uploadMultipleImages, deleteImage } = require('../controller/uploadController');
const { uploadSingle, uploadMultiple } = require('../middleware/upload');
const { authenticate } = require('../middleware/auth');

/**
 * Upload Routes
 * Image upload and management endpoints
 */

// All upload routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/uploads/image
 * @desc    Upload single image
 * @access  Private
 * @body    multipart/form-data: { image: File, folder?: string }
 */
router.post('/image', uploadSingle, uploadSingleImage);

/**
 * @route   POST /api/v1/uploads/images
 * @desc    Upload multiple images (up to 10)
 * @access  Private
 * @body    multipart/form-data: { images: File[], folder?: string }
 */
router.post('/images', uploadMultiple, uploadMultipleImages);

/**
 * @route   DELETE /api/v1/uploads/image/:publicId
 * @desc    Delete image from Cloudinary
 * @access  Private
 * @params  publicId: Cloudinary public ID (URL-encoded)
 */
router.delete('/image/:publicId', deleteImage);

module.exports = router;
