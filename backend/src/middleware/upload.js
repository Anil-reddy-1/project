const multer = require('multer');
const path = require('path');

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

// Export configured multer middleware
module.exports = {
  // Single file upload
  uploadSingle: upload.single('image'),
  
  // Multiple files upload (up to 10 images)
  uploadMultiple: upload.array('images', 10),
  
  // Fields-based upload (for complex forms)
  uploadFields: upload.fields([
    { name: 'images', maxCount: 10 },
    { name: 'primaryImage', maxCount: 1 }
  ]),
};
