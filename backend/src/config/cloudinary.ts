/**
 * Cloudinary SDK initialization.
 * Derived from: tech-spec.md §1 (File Storage — replacing Firebase Storage on backend)
 *
 * All file uploads (shop photos, verification images, dispute attachments)
 * are sent to this Express service as multipart/form-data,
 * uploaded to Cloudinary here, and the returned URL stored in Firestore.
 *
 * The frontend never touches a storage SDK — it posts the file to Express,
 * which returns { url, publicId }.
 */

import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export { cloudinary };
