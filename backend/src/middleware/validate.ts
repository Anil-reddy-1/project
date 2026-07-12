/**
 * Request validation middleware for shops and items.
 * Derived from: phase-2-implementation.md §5.3, schema.md §2
 *
 * Provides reusable validation functions that can be composed
 * in route handlers to validate request bodies before processing.
 */

import type { Request, Response, NextFunction } from "express";
import type { DayOfWeek, OperatingHours } from "../types";

/** Validation error response helper */
function validationError(res: Response, message: string): void {
  res.status(400).json({ error: "Validation Error", message });
}

// ─── Shop Validation ──────────────────────────────────────────────────────────

const VALID_DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const VALID_CATEGORIES = [
  "groceries",
  "vegetables",
  "dairy",
  "bakery",
  "meat_seafood",
  "beverages",
  "snacks",
  "household",
  "pharmacy",
  "electronics",
  "clothing",
  "hardware",
  "stationery",
  "other",
];

/**
 * Validate operating hours structure:
 * { days: string[], open: string, close: string }
 */
function validateOperatingHours(hours: unknown): hours is OperatingHours {
  if (!hours || typeof hours !== "object") return false;

  const h = hours as Record<string, unknown>;

  // Validate days array
  if (!Array.isArray(h.days) || h.days.length === 0) return false;
  if (!h.days.every((d) => typeof d === "string" && VALID_DAYS.includes(d as DayOfWeek))) {
    return false;
  }

  // Validate time format (HH:MM)
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (typeof h.open !== "string" || !timeRegex.test(h.open)) return false;
  if (typeof h.close !== "string" || !timeRegex.test(h.close)) return false;

  return true;
}

/**
 * Validate shop creation request body
 */
export function validateShopCreation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { name, address, lat, lng, category, operatingHours, moqThreshold } =
    req.body as Record<string, unknown>;

  // Required fields
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    validationError(res, "name is required and must be a non-empty string");
    return;
  }
  if (name.length > 200) {
    validationError(res, "name must be at most 200 characters");
    return;
  }

  if (!address || typeof address !== "string" || address.trim().length === 0) {
    validationError(res, "address is required and must be a non-empty string");
    return;
  }
  if (address.length > 500) {
    validationError(res, "address must be at most 500 characters");
    return;
  }

  // Geolocation validation
  if (typeof lat !== "number" || lat < -90 || lat > 90) {
    validationError(res, "lat must be a number between -90 and 90");
    return;
  }
  if (typeof lng !== "number" || lng < -180 || lng > 180) {
    validationError(res, "lng must be a number between -180 and 180");
    return;
  }

  // Category validation
  if (!category || typeof category !== "string") {
    validationError(res, "category is required and must be a string");
    return;
  }
  if (!VALID_CATEGORIES.includes(category)) {
    validationError(
      res,
      `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
    );
    return;
  }

  // Operating hours validation
  if (!operatingHours) {
    validationError(res, "operatingHours is required");
    return;
  }
  if (!validateOperatingHours(operatingHours)) {
    validationError(
      res,
      "operatingHours must be { days: DayOfWeek[], open: HH:MM, close: HH:MM }",
    );
    return;
  }

  // MOQ threshold validation
  if (typeof moqThreshold !== "number" || moqThreshold < 0) {
    validationError(res, "moqThreshold must be a non-negative number");
    return;
  }

  // Optional photo URL validation
  if (req.body.photoUrl !== undefined) {
    if (typeof req.body.photoUrl !== "string") {
      validationError(res, "photoUrl must be a string");
      return;
    }
    if (req.body.photoUrl && !isValidUrl(req.body.photoUrl)) {
      validationError(res, "photoUrl must be a valid URL");
      return;
    }
  }

  next();
}

/**
 * Validate shop update request body
 */
export function validateShopUpdate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const body = req.body as Record<string, unknown>;

  // Name validation (if provided)
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      validationError(res, "name must be a non-empty string");
      return;
    }
    if (body.name.length > 200) {
      validationError(res, "name must be at most 200 characters");
      return;
    }
  }

  // Address validation (if provided)
  if (body.address !== undefined) {
    if (typeof body.address !== "string" || body.address.trim().length === 0) {
      validationError(res, "address must be a non-empty string");
      return;
    }
    if (body.address.length > 500) {
      validationError(res, "address must be at most 500 characters");
      return;
    }
  }

  // Geolocation validation (must provide both lat and lng)
  if (body.lat !== undefined || body.lng !== undefined) {
    if (body.lat === undefined || body.lng === undefined) {
      validationError(res, "Both lat and lng must be provided together");
      return;
    }
    if (typeof body.lat !== "number" || body.lat < -90 || body.lat > 90) {
      validationError(res, "lat must be a number between -90 and 90");
      return;
    }
    if (typeof body.lng !== "number" || body.lng < -180 || body.lng > 180) {
      validationError(res, "lng must be a number between -180 and 180");
      return;
    }
  }

  // Category validation (if provided)
  if (body.category !== undefined) {
    if (typeof body.category !== "string") {
      validationError(res, "category must be a string");
      return;
    }
    if (!VALID_CATEGORIES.includes(body.category)) {
      validationError(
        res,
        `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      );
      return;
    }
  }

  // Operating hours validation (if provided)
  if (body.operatingHours !== undefined) {
    if (!validateOperatingHours(body.operatingHours)) {
      validationError(
        res,
        "operatingHours must be { days: DayOfWeek[], open: HH:MM, close: HH:MM }",
      );
      return;
    }
  }

  // MOQ threshold validation (if provided)
  if (body.moqThreshold !== undefined) {
    if (typeof body.moqThreshold !== "number" || body.moqThreshold < 0) {
      validationError(res, "moqThreshold must be a non-negative number");
      return;
    }
  }

  // Photo URL validation (if provided)
  if (body.photoUrl !== undefined) {
    if (typeof body.photoUrl !== "string") {
      validationError(res, "photoUrl must be a string");
      return;
    }
    if (body.photoUrl && !isValidUrl(body.photoUrl)) {
      validationError(res, "photoUrl must be a valid URL");
      return;
    }
  }

  // Verification status validation (admin only - checked in route handler)
  if (body.verificationStatus !== undefined) {
    const validStatuses = ["pending", "verified", "rejected"];
    if (!validStatuses.includes(body.verificationStatus as string)) {
      validationError(
        res,
        `verificationStatus must be one of: ${validStatuses.join(", ")}`,
      );
      return;
    }
  }

  next();
}

// ─── Item Validation ──────────────────────────────────────────────────────────

const VALID_UNITS = [
  "kg",
  "g",
  "l",
  "ml",
  "piece",
  "dozen",
  "pack",
  "box",
  "bundle",
  "bag",
];

/**
 * Validate item creation request body
 */
export function validateItemCreation(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { name, price, stockQty, unit } = req.body as Record<string, unknown>;

  // Name validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    validationError(res, "name is required and must be a non-empty string");
    return;
  }
  if (name.length > 200) {
    validationError(res, "name must be at most 200 characters");
    return;
  }

  // Price validation
  if (typeof price !== "number" || price < 0) {
    validationError(res, "price must be a non-negative number");
    return;
  }
  if (price > 1000000) {
    validationError(res, "price must be at most 1,000,000");
    return;
  }

  // Stock quantity validation
  if (typeof stockQty !== "number" || stockQty < 0 || !Number.isInteger(stockQty)) {
    validationError(res, "stockQty must be a non-negative integer");
    return;
  }
  if (stockQty > 1000000) {
    validationError(res, "stockQty must be at most 1,000,000");
    return;
  }

  // Unit validation
  if (!unit || typeof unit !== "string") {
    validationError(res, "unit is required and must be a string");
    return;
  }
  if (!VALID_UNITS.includes(unit)) {
    validationError(res, `unit must be one of: ${VALID_UNITS.join(", ")}`);
    return;
  }

  // Optional isAvailable validation
  if (req.body.isAvailable !== undefined && typeof req.body.isAvailable !== "boolean") {
    validationError(res, "isAvailable must be a boolean");
    return;
  }

  // Optional images validation
  if (req.body.images !== undefined) {
    if (!Array.isArray(req.body.images)) {
      validationError(res, "images must be an array");
      return;
    }
    for (const img of req.body.images) {
      if (!img || typeof img !== "object") {
        validationError(res, "each image must be an object");
        return;
      }
      if (typeof img.url !== "string" || !isValidUrl(img.url)) {
        validationError(res, "each image must have a valid url");
        return;
      }
      if (typeof img.publicId !== "string" || img.publicId.trim().length === 0) {
        validationError(res, "each image must have a non-empty publicId");
        return;
      }
    }
  }

  next();
}

/**
 * Validate item update request body
 */
export function validateItemUpdate(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const body = req.body as Record<string, unknown>;

  // Name validation (if provided)
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      validationError(res, "name must be a non-empty string");
      return;
    }
    if (body.name.length > 200) {
      validationError(res, "name must be at most 200 characters");
      return;
    }
  }

  // Price validation (if provided)
  if (body.price !== undefined) {
    if (typeof body.price !== "number" || body.price < 0) {
      validationError(res, "price must be a non-negative number");
      return;
    }
    if (body.price > 1000000) {
      validationError(res, "price must be at most 1,000,000");
      return;
    }
  }

  // Stock quantity validation (if provided)
  if (body.stockQty !== undefined) {
    if (typeof body.stockQty !== "number" || body.stockQty < 0 || !Number.isInteger(body.stockQty)) {
      validationError(res, "stockQty must be a non-negative integer");
      return;
    }
    if (body.stockQty > 1000000) {
      validationError(res, "stockQty must be at most 1,000,000");
      return;
    }
  }

  // Unit validation (if provided)
  if (body.unit !== undefined) {
    if (typeof body.unit !== "string") {
      validationError(res, "unit must be a string");
      return;
    }
    if (!VALID_UNITS.includes(body.unit)) {
      validationError(res, `unit must be one of: ${VALID_UNITS.join(", ")}`);
      return;
    }
  }

  // isAvailable validation (if provided)
  if (body.isAvailable !== undefined && typeof body.isAvailable !== "boolean") {
    validationError(res, "isAvailable must be a boolean");
    return;
  }

  // Images validation (if provided)
  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) {
      validationError(res, "images must be an array");
      return;
    }
    for (const img of body.images) {
      if (!img || typeof img !== "object") {
        validationError(res, "each image must be an object");
        return;
      }
      if (typeof img.url !== "string" || !isValidUrl(img.url)) {
        validationError(res, "each image must have a valid url");
        return;
      }
      if (typeof img.publicId !== "string" || img.publicId.trim().length === 0) {
        validationError(res, "each image must have a non-empty publicId");
        return;
      }
    }
  }

  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Basic URL validation
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
