const app = require('./app');
const { connectRedis, disconnectRedis } = require("./config/redis.js");
const { initializeTables } = require("./models/createTables.js");
const logger = require("./utils/logger.js");

const port = process.env.PORT || 4001;

process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  await disconnectRedis();
  process.exit(0);
});

// Server running
app.listen(port, async () => {
  logger.info(`Server running on port ${port}`);
  logger.info(`API available at http://localhost:${port}/api/v1`);
  
  try {
    await connectRedis();
    await initializeTables();
    logger.info("All services initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize services:", error);
  }
});
