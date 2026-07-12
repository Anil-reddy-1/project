/**
 * Global Express error handler.
 * Derived from: tech-spec.md §13
 *
 * Catches all errors passed via next(err) and returns a uniform
 * JSON error response. Must be the LAST middleware registered in index.ts.
 *
 * Uniform response shape:
 *   { error: string, message: string, ...(stack in development) }
 */

import type { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

/** Structured API error — throw this from route handlers */
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/**
 * Global error handler middleware.
 * Must be registered with 4 arguments so Express recognises it as an error handler.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Multer errors (file size / type)
  if (err.name === "MulterError") {
    res.status(400).json({ error: "Upload Error", message: err.message });
    return;
  }

  // Application-level errors (thrown from route handlers)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.code ?? "Error",
      message: err.message,
    });
    return;
  }

  // Unknown/unexpected errors
  console.error("[unhandled error]", err);

  res.status(500).json({
    error: "Internal Server Error",
    message: env.IS_PRODUCTION ? "Something went wrong." : err.message,
    ...(env.IS_PRODUCTION ? {} : { stack: err.stack }),
  });
}
