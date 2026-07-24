/**
 * Express application entry point.
 * Derived from: tech-spec.md §1, §2
 *
 * Startup order:
 * 1. Load & validate environment variables (throws if any required var is missing)
 * 2. Initialize Firebase Admin SDK (lazy — first access triggers init)
 * 3. Configure Express middleware stack (security, logging, CORS, body parsing)
 * 4. Mount all route groups
 * 5. Register global error handler (must be last)
 * 6. Start the server
 */

// ─── Load environment variables first ────────────────────────────────────────
import "dotenv/config";
import { env } from "./config/env";
import "express-async-errors";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middleware/error";
import router from "./routes/index";

const app = express();

// ─── Security ─────────────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow only the configured origin(s). In development: localhost:3000.
const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} is not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "bypass-tunnel-reminder"],
  }),
);

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(morgan(env.IS_PRODUCTION ? "combined" : "dev"));

// ─── Body parsers ─────────────────────────────────────────────────────────────
// JSON bodies (REST requests)
app.use(express.json({ limit: "1mb" }));
// URL-encoded bodies (form submissions — rare, but for Razorpay webhook compatibility)
app.use(express.urlencoded({ extended: true }));

// ─── Route groups ─────────────────────────────────────────────────────────────
app.use("/", router);

// ─── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler);

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  console.log(
    `\n🚀  Express API running on http://localhost:${env.PORT}  [${env.NODE_ENV}]`,
  );
  console.log(`   CORS allowed origins: ${allowedOrigins.join(", ")}\n`);
});

export default app;
