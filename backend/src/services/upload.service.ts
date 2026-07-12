/**
 * Upload service — Cloudinary integration.
 * Derived from: tech-spec.md §1 (Firebase Storage → Cloudinary on backend)
 *
 * Accepts a Buffer (from Multer's memoryStorage) and uploads it to Cloudinary.
 * Returns the permanent CDN URL and public ID for storage in Firestore.
 *
 * Usage:
 *   const result = await uploadToCloudinary(req.file.buffer, "shop_photos");
 *   // Store result.url in Firestore document
 */

import { cloudinary } from "../config/cloudinary";
import type { UploadFolder } from "../types";

export interface UploadResult {
  /** CDN URL for the uploaded asset */
  url: string;
  /** Cloudinary public ID — needed to delete/replace the asset later */
  publicId: string;
  /** Width in pixels (if image) */
  width?: number;
  /** Height in pixels (if image) */
  height?: number;
}

/**
 * Upload a file buffer to Cloudinary.
 *
 * @param buffer      - File contents from Multer memoryStorage
 * @param folder      - Cloudinary folder to organize uploads
 * @param resourceType - Cloudinary resource type (default: "image")
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  folder: UploadFolder,
  resourceType: "image" | "raw" | "video" = "image",
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // Generate a unique public ID to prevent collisions
        use_filename: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
        });
      },
    );

    stream.end(buffer);
  });
}

/**
 * Delete an asset from Cloudinary by its public ID.
 * Used when a shop photo is replaced or a user account is deleted.
 */
export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}
