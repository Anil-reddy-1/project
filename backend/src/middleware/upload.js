const multer = require('multer');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Multer Middleware for File Uploads
 * Handles multipart/form-data and file validation
 */

// Configure memory storage (files stored in memory as Buffer)
const storage = multer.memoryStorage();

// File filter - only accept images
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: fileFilter,
});

// Wrapper to log file uploads
const uploadMultipleWithLogging = (req, res, next) => {
  upload.array('images', 10)(req, res, (err) => {
    if (err) {
      logger.error('Multer upload error:', { error: err.message });
      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: err.message
      });
    }
    
    logger.info('Files received by multer:', {
      fileCount: req.files?.length || 0,
      files: req.files?.map(f => ({
        fieldname: f.fieldname,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })) || []
    });
    
    next();
  });
};

// Export configured multer middleware
module.exports = {
  // Single file upload
  uploadSingle: upload.single('image'),
  
  // Multiple files upload (up to 10 images)
  uploadMultiple: uploadMultipleWithLogging,
  
  // Fields-based upload (for complex forms)
  uploadFields: upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'primaryImage', maxCount: 1 }
  ]),
};
