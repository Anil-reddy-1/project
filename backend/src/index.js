const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./config/db.js");
const { connectRedis, disconnectRedis } = require("./config/redis.js");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler.js");
const { success } = require("./utils/response.js");
const logger = require("./utils/logger.js");

// Import all routes
const signupRoutes = require("./routes/signup.routes.js");
const authRoutes = require("./routes/auth.routes.js");
const userRoutes = require("./routes/user.routes.js");
const roleRoutes = require("./routes/role.routes.js");
const staffRoutes = require("./routes/staff.routes.js");
const stockRoutes = require("./routes/stock.routes.js");
const pricingRoutes = require("./routes/pricing.routes.js");
const orderRoutes = require("./routes/order.routes.js");
const deliveryRoutes = require("./routes/delivery.routes.js");
const debtRoutes = require("./routes/debt.routes.js");
const reportRoutes = require("./routes/report.routes.js");
const dashboardRoutes = require("./routes/dashboard.routes.js");
const uploadRoutes = require("./routes/upload.routes.js");
const productRoutes = require("./routes/product.routes.js");
const wishlistRoutes = require("./routes/wishlist.routes.js");

dotenv.config();

const app = express();
const port = process.env.PORT || 4001;

// Middleware
app.use(express.json());
app.use(cors());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// API v1 Routes
const API_PREFIX = "/api/v1";

// Public routes (no authentication required)
app.use(`${API_PREFIX}/signup`, signupRoutes);

// Protected routes (authentication required)
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/staff`, staffRoutes);
app.use(`${API_PREFIX}/stock`, stockRoutes);
app.use(`${API_PREFIX}/pricing`, pricingRoutes);
app.use(`${API_PREFIX}/orders`, orderRoutes);
app.use(`${API_PREFIX}/deliveries`, deliveryRoutes);
app.use(`${API_PREFIX}/debts`, debtRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/uploads`, uploadRoutes);
app.use(`${API_PREFIX}/products`, productRoutes);
app.use(`${API_PREFIX}/wishlist`, wishlistRoutes);

// Root Health / DB Connection Test
app.get("/", async (req, res) => {
  try {
    const result = await pool.query("select current_database()");
    return success(res, {
      message: `Enterprise Operations Manager API v1.0`,
      data: {
        status: "healthy",
        database: result.rows[0].current_database,
        version: "1.0.0",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    return res.status(503).json({
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Database connection failed",
      },
    });
  }
});

// Error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await disconnectRedis();
  process.exit(0);
});

const { initializeTables } = require("./models/createTables.js");

// Server running
app.listen(port, async () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`API available at http://localhost:${port}${API_PREFIX}`);
  
  try {
    await connectRedis();
    await initializeTables();
    logger.info("All services initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize services:", error);
  }
});

module.exports = app;
