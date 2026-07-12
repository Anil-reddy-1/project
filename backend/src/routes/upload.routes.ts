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

export default router;
