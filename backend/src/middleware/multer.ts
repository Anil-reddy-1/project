/**
 * Multer configuration — in-memory storage.
 * Derived from: tech-spec.md §1 (File uploads → Cloudinary via Express)
 *
 * Files are kept in memory (Buffer) and streamed directly to Cloudinary.
 * No files touch the filesystem at any point.
 *
 * Limits:
 * - Max file size: 10 MB (shop photos, verification images)
 * - Accepted MIME types: image/jpeg, image/png, image/webp
 */

import multer from "multer";
import type { Request } from "express";

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const storage = multer.memoryStorage();

function fileFilter(
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Unsupported file type: ${file.mimetype}. Accepted: ${ACCEPTED_MIME_TYPES.join(", ")}`,
      ),
    );
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
});
