/**
 * Centralized logging utility using Winston
 * Provides structured logging with different transports for dev/prod
 */

const winston = require("winston");
const path = require("path");

const { combine, timestamp, errors, json, colorize, printf, splat } =
  winston.format;

// Custom format for development
const devFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;

  if (Object.keys(metadata).length > 0 && metadata.stack === undefined) {
    msg += ` ${JSON.stringify(metadata)}`;
  }

  if (metadata.stack) {
    msg += `\n${metadata.stack}`;
  }

  return msg;
});

// Determine log level from environment
const level =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

// Create transports based on environment
const transports = [];

if (process.env.NODE_ENV === "production") {
  // Production: JSON format for log aggregation services
  transports.push(
    new winston.transports.Console({
      format: combine(timestamp(), errors({ stack: true }), splat(), json()),
    }),
  );
} else {
  // Development: Colorized, human-readable output
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp({ format: "HH:mm:ss" }),
        errors({ stack: true }),
        splat(),
        devFormat,
      ),
    }),
  );
}

// Create logger instance
const logger = winston.createLogger({
  level,
  defaultMeta: { service: "ganga-jamuna-api" },
  transports,
  // Don't exit on unhandled errors
  exitOnError: false,
});

// Create a child logger with additional context
logger.child = (metadata) => {
  return winston.createLogger({
    level,
    defaultMeta: { service: "ganga-jamuna-api", ...metadata },
    transports,
    exitOnError: false,
  });
};

module.exports = logger;
