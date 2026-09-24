/**
 * Test Setup Configuration
 * Sets up test environment and globals
 */

// Set test environment before anything else
process.env.NODE_ENV = 'test';

// Increase Jest timeout for integration tests
jest.setTimeout(60000);

// Suppress logs during tests for cleaner output
const originalConsole = global.console;
global.console = {
  ...console,
  log: jest.fn(), // Suppress console.log
  debug: jest.fn(), // Suppress console.debug
  info: jest.fn(), // Suppress console.info
  warn: originalConsole.warn, // Keep warnings
  error: originalConsole.error, // Keep errors
};

