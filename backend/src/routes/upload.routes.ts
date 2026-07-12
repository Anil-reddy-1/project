/**
 * Upload routes — Cloudinary file upload endpoint.
 * Derived from: tech-spec.md §1 (all file uploads through Express → Cloudinary)
 *
 * POST /upload
 *   - Requires authentication (any role can upload, specific folders are role-gated)
 *   - Accepts multipart/form-data with a single file field named "file"
 *   - Optional query param: folder (shop_photos | verification_images | dispute_attachments)
 *   - Returns: { url, publicId }
 */

import { Router, type Request, type Response } from "express";
import { verifyFirebaseToken } from "../middleware/auth";
import { upload } from "../middleware/multer";
import { uploadToCloudinary } from "../services/upload.service";
import { AppError } from "../middleware/error";
import type { UploadFolder } from "../types";

const router = Router();

const VALID_FOLDERS: UploadFolder[] = [
  "shop_photos",
  "verification_images",
  "dispute_attachments",
  "product_images",
];

/**
 * POST /upload
 * Upload a single file to Cloudinary.
 * Returns { url, publicId } for storage in Firestore.
 */
router.post(
  "/",
  verifyFirebaseToken,
  upload.single("file"),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError("No file provided. Use field name: 'file'.", 400);
    }

    const folderParam = (req.query.folder as string) ?? "shop_photos";

    if (!VALID_FOLDERS.includes(folderParam as UploadFolder)) {
      throw new AppError(
        `Invalid folder. Allowed: ${VALID_FOLDERS.join(", ")}`,
        400,
      );
    }

    const result = await uploadToCloudinary(
      req.file.buffer,
      folderParam as UploadFolder,
    );

    res.status(201).json({
      url: result.url,
      publicId: result.publicId,
      width: result.width,
      height: result.height,
    });
  },
);

/**
 * POST /upload/multiple
 * Upload multiple files to Cloudinary.
 * Returns array of { url, publicId } for storage in Firestore.
 */
router.post(
  "/multiple",
  verifyFirebaseToken,
  upload.array("files", 10), // Maximum 10 files
  async (req: Request, res: Response) => {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new AppError("No files provided. Use field name: 'files'.", 400);
    }

    const folderParam = (req.query.folder as string) ?? "product_images";

    if (!VALID_FOLDERS.includes(folderParam as UploadFolder)) {
      throw new AppError(
        `Invalid folder. Allowed: ${VALID_FOLDERS.join(", ")}`,
        400,
      );
    }

    // Additional validation for multiple files
    const maxFiles = 10;
    const maxFileSize = 5 * 1024 * 1024; // 5MB per file for product images
    
    if (req.files.length > maxFiles) {
      throw new AppError(`Maximum ${maxFiles} files allowed per upload.`, 400);
    }

    // Validate each file
    for (const file of req.files) {
      if (file.size > maxFileSize) {
        throw new AppError(
          `File "${file.originalname}" exceeds maximum size of 5MB.`,
          400
        );
      }

      // Additional MIME type validation
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.mimetype)) {
        throw new AppError(
          `File "${file.originalname}" has unsupported format. Use JPEG, PNG, WebP, or GIF.`,
          400
        );
      }
    }

    // Upload all files in parallel
    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, folderParam as UploadFolder)
    );

    const results = await Promise.all(uploadPromises);

    res.status(201).json({
      files: results.map((result) => ({
        url: result.url,
        publicId: result.publicId,
        width: result.width,
        height: result.height,
      })),
    });
  },
);

export default router;
